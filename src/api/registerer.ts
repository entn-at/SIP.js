import { EventEmitter } from "events";

import {
  C,
  Grammar,
  Logger,
  OutgoingRegisterRequest,
  OutgoingRequestMessage,
  URI
} from "../core";

import { Emitter, makeEmitter } from "./emitter";
import { RequestPendingError } from "./exceptions";
import { RegistererOptions } from "./registerer-options";
import { RegistererRegisterOptions } from "./registerer-register-options";
import { RegistererState } from "./registerer-state";
import { RegistererUnregisterOptions } from "./registerer-unregister-options";
import { UserAgent } from "./user-agent";

/**
 * A registerer registers a contact for an address of record (outgoing REGISTER).
 * @public
 */
export class Registerer {

  /** Default registerer options. */
  private static readonly defaultOptions: Required<RegistererOptions> = {
    expires: 600,
    extraContactHeaderParams: [],
    extraHeaders: [],
    logConfiguration: true,
    instanceId: "",
    params: {},
    regId: 0,
    registrar: new URI("sip", "anonymous", "anonymous.invalid")
  };

  // http://stackoverflow.com/users/109538/broofa
  private static newUUID(): string {
    const UUID: string = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r: number = Math.floor(Math.random() * 16);
      const v: number = c === "x" ? r : (r % 4 + 8);
      return v.toString(16);
    });
    return UUID;
  }

  private id: string;
  private expires: number;
  private logger: Logger;
  private options: RegistererOptions;
  private request: OutgoingRequestMessage;
  private userAgent: UserAgent;

  private registrationExpiredTimer: any | undefined;
  private registrationTimer: any | undefined;

  /** The contacts returned from the most recent accepted REGISTER request. */
  private _contacts: Array<string> = [];

  /** The registration state. */
  private _state: RegistererState = RegistererState.Initial;
  /** Emits when the registration state changes. */
  private _stateEventEmitter = new EventEmitter();

  /** True is waiting for final response to outstanding REGISTER request. */
  private _waiting = false;
  /** Emits when waiting changes. */
  private _waitingEventEmitter = new EventEmitter();

  /**
   * Constructs a new instance of the `Registerer` class.
   * @param userAgent - User agent. See {@link UserAgent} for details.
   * @param options - Options bucket. See {@link RegistererOptions} for details.
   */
  constructor(userAgent: UserAgent, options: RegistererOptions = {}) {

    // Set user agent
    this.userAgent = userAgent;

    // Default registrar is domain portion of user agent uri
    const defaultUserAgentRegistrar = userAgent.configuration.uri.clone();
    defaultUserAgentRegistrar.user = undefined;

    // Initialize configuration
    this.options = {
      // start with the default option values
      ...Registerer.defaultOptions,
      // set the appropriate default registrar
      ...{ registrar: defaultUserAgentRegistrar },
      // apply any options passed in via the constructor
      ...options
    };

    // Make sure we are not using references to array options
    this.options.extraContactHeaderParams = (this.options.extraContactHeaderParams || []).slice();
    this.options.extraHeaders = (this.options.extraHeaders || []).slice();

    // Make sure we are not using references to registrar uri
    if (!this.options.registrar) {
      throw new Error("Registrar undefined.");
    }
    this.options.registrar = this.options.registrar.clone();

    // Set instanceId and regId conditional defaults and validate
    if (this.options.regId && !this.options.instanceId) {
      this.options.instanceId = Registerer.newUUID();
    } else if (!this.options.regId && this.options.instanceId) {
      this.options.regId = 1;
    }
    if (this.options.instanceId && Grammar.parse(this.options.instanceId, "uuid") === -1) {
      throw new Error("Invalid instanceId.");
    }
    if (this.options.regId && this.options.regId < 0) {
      throw new Error("Invalid regId.");
    }

    const registrar = this.options.registrar;
    const fromURI = (this.options.params && this.options.params.fromUri) || userAgent.userAgentCore.configuration.aor;
    const toURI = (this.options.params && this.options.params.toUri) || userAgent.configuration.uri;
    const params = this.options.params || {};
    const extraHeaders = (options.extraHeaders || []).slice();

    // Build the request
    this.request = userAgent.userAgentCore.makeOutgoingRequestMessage(
      C.REGISTER,
      registrar,
      fromURI,
      toURI,
      params,
      extraHeaders,
      undefined
    );

    // Registration expires
    this.expires = this.options.expires || Registerer.defaultOptions.expires;
    if (this.expires < 0) {
      throw new Error("Invalid expires.");
    }

    // initialize logger
    this.logger = userAgent.getLogger("sip.Registerer");

    if (this.options.logConfiguration) {
      this.logger.log("Configuration:");
      Object.keys(this.options).forEach((key) => {
        const value = (this.options as any)[key];
        switch (key) {
          case "registrar":
            this.logger.log("· " + key + ": " + value);
            break;
          default:
            this.logger.log("· " + key + ": " + JSON.stringify(value));
        }
      });
    }

    userAgent.transport.on("disconnected", () => this.onTransportDisconnected());

    // Add to UA's collection
    this.id = this.request.callId + this.request.from.parameters.tag;
    this.userAgent.registerers[this.id] = this;
  }

  /** The registered contacts. */
  get contacts(): Array<string> {
    return this._contacts.slice();
  }

  /** The registration state. */
  get state(): RegistererState {
    return this._state;
  }

  /** Emits when the registerer state changes. */
  get stateChange(): Emitter<RegistererState> {
    return makeEmitter(this._stateEventEmitter);
  }

  /** Destructor. */
  public async dispose(): Promise<void> {
    // Remove from UA's collection
    delete this.userAgent.registerers[this.id];

    // If registered, unregisters and resolves after final response received.
    return new Promise((resolve, reject) => {
      const doClose = () => {
        // If we are registered, unregister and resolve after our state changes
        if (!this.waiting && this._state === RegistererState.Registered) {
          this.stateChange.once(() => resolve());
          this.unregister();
          return;
        }
        // Otherwise just resolve
        resolve();
      };

      // If we are waiting for an outstanding request, wait for it to finish and then try closing.
      // Otherwise just try closing.
      if (this.waiting) {
        this.waitingChange.once(() => doClose());
      } else {
        doClose();
      }
    });
  }

  /**
   * Sends the REGISTER request.
   * @remarks
   * If successfull, sends re-REGISTER requests prior to registration expiration until `unsubscribe()` is called.
   * Rejects with `RequestPendingError` if a REGISTER request is alreadly in progress.
   */
  public async register(options: RegistererRegisterOptions = {}): Promise<OutgoingRegisterRequest> {
    // UAs MUST NOT send a new registration (that is, containing new Contact
    // header field values, as opposed to a retransmission) until they have
    // received a final response from the registrar for the previous one or
    // the previous REGISTER request has timed out.
    // https://tools.ietf.org/html/rfc3261#section-10.2
    if (this.waiting) {
      const error = new RequestPendingError("REGISTER request already in progress, waiting for final response");
      return Promise.reject(error);
    }

    // Options
    if (options.requestOptions) {
      this.options = {...this.options, ...options.requestOptions};
    }

    // Extra headers
    const extraHeaders = (this.options.extraHeaders || []).slice();
    extraHeaders.push("Contact: " + this.generateContactHeader(this.expires));
    // this is UA.C.ALLOWED_METHODS, removed to get around circular dependency
    extraHeaders.push("Allow: " + [
      "ACK",
      "CANCEL",
      "INVITE",
      "MESSAGE",
      "BYE",
      "OPTIONS",
      "INFO",
      "NOTIFY",
      "REFER"
    ].toString());

    // Call-ID: All registrations from a UAC SHOULD use the same Call-ID
    // header field value for registrations sent to a particular
    // registrar.
    //
    // CSeq: The CSeq value guarantees proper ordering of REGISTER
    // requests.  A UA MUST increment the CSeq value by one for each
    // REGISTER request with the same Call-ID.
    // https://tools.ietf.org/html/rfc3261#section-10.2
    this.request.cseq++;
    this.request.setHeader("cseq", this.request.cseq + " REGISTER");
    this.request.extraHeaders = extraHeaders;

    this.waitingToggle(true);

    const outgoingRegisterRequest = this.userAgent.userAgentCore.register(this.request, {
      onAccept: (response): void => {
        let expires: number | undefined;

        // FIXME: This does NOT appear to be to spec and should be removed.
        // I haven't found anywhere that an Expires header may be used in a response.
        if (response.message.hasHeader("expires")) {
          expires = Number(response.message.getHeader("expires"));
        }

        // 8. The registrar returns a 200 (OK) response.  The response MUST
        // contain Contact header field values enumerating all current
        // bindings.  Each Contact value MUST feature an "expires"
        // parameter indicating its expiration interval chosen by the
        // registrar.  The response SHOULD include a Date header field.
        // https://tools.ietf.org/html/rfc3261#section-10.3
        this._contacts = response.message.getHeaders("contact");
        let contacts = this._contacts.length;
        if (!contacts) {
          this.logger.error("No Contact header in response to REGISTER, dropping response.");
          this.unregistered();
          return;
        }

        // The 200 (OK) response from the registrar contains a list of Contact
        // fields enumerating all current bindings.  The UA compares each
        // contact address to see if it created the contact address, using
        // comparison rules in Section 19.1.4.  If so, it updates the expiration
        // time interval according to the expires parameter or, if absent, the
        // Expires field value.  The UA then issues a REGISTER request for each
        // of its bindings before the expiration interval has elapsed.
        // https://tools.ietf.org/html/rfc3261#section-10.2.4
        let contact: any;
        while (contacts--) {
          contact = response.message.parseHeader("contact", contacts);
          if (contact.uri.user === this.userAgent.contact.uri.user) {
            expires = contact.getParam("expires");
            break;
          } else {
            contact = undefined;
          }
        }

        // There must be a matching contact.
        if (contact === undefined) {
          this.logger.error("No Contact header pointing to us, dropping response");
          this.unregistered();
          this.waitingToggle(false);
          return;
        }

        // The contact must have an expires.
        if (expires === undefined) {
          this.logger.error("Contact pointing to us is missing expires parameter, dropping response");
          this.unregistered();
          this.waitingToggle(false);
          return;
        }

        // Save gruu values
        if (contact.hasParam("temp-gruu")) {
          this.userAgent.contact.tempGruu = Grammar.URIParse(contact.getParam("temp-gruu").replace(/"/g, ""));
        }
        if (contact.hasParam("pub-gruu")) {
          this.userAgent.contact.pubGruu = Grammar.URIParse(contact.getParam("pub-gruu").replace(/"/g, ""));
        }

        this.registered(expires);
        if (options.requestDelegate && options.requestDelegate.onAccept) {
          options.requestDelegate.onAccept(response);
        }
        this.waitingToggle(false);
      },
      onProgress: (response): void => {
        if (options.requestDelegate && options.requestDelegate.onProgress) {
          options.requestDelegate.onProgress(response);
        }
      },
      onRedirect: (response): void => {
        this.logger.error("Redirect received. Not supported.");
        this.unregistered();
        if (options.requestDelegate && options.requestDelegate.onRedirect) {
          options.requestDelegate.onRedirect(response);
        }
        this.waitingToggle(false);
      },
      onReject: (response): void => {
        if (response.message.statusCode === 423) {
          // If a UA receives a 423 (Interval Too Brief) response, it MAY retry
          // the registration after making the expiration interval of all contact
          // addresses in the REGISTER request equal to or greater than the
          // expiration interval within the Min-Expires header field of the 423
          // (Interval Too Brief) response.
          // https://tools.ietf.org/html/rfc3261#section-10.2.8
          //
          // The registrar MAY choose an expiration less than the requested
          // expiration interval.  If and only if the requested expiration
          // interval is greater than zero AND smaller than one hour AND
          // less than a registrar-configured minimum, the registrar MAY
          // reject the registration with a response of 423 (Interval Too
          // Brief).  This response MUST contain a Min-Expires header field
          // that states the minimum expiration interval the registrar is
          // willing to honor.  It then skips the remaining steps.
          // https://tools.ietf.org/html/rfc3261#section-10.3
          if (!response.message.hasHeader("min-expires")) {
            // This response MUST contain a Min-Expires header field
            this.logger.error("423 response received for REGISTER without Min-Expires, dropping response");
            this.unregistered();
            this.waitingToggle(false);
            return;
          }
          // Increase our registration interval to the suggested minimum
          this.expires = Number(response.message.getHeader("min-expires"));
          // Attempt the registration again immediately
          this.waitingToggle(false);
          this.register();
          return;
        }
        this.logger.warn(`Failed to register, status code ${response.message.statusCode}`);
        this.unregistered();
        if (options.requestDelegate && options.requestDelegate.onReject) {
          options.requestDelegate.onReject(response);
        }
        this.waitingToggle(false);
      },
      onTrying: (response): void => {
        if (options.requestDelegate && options.requestDelegate.onTrying) {
          options.requestDelegate.onTrying(response);
        }
      }
    });

    return Promise.resolve(outgoingRegisterRequest);
  }

  /**
   * Sends the REGISTER request with expires equal to zero.
   * Rejects with `RequestPendingError` if a REGISTER request is alreadly in progress.
   */
  public async unregister(options: RegistererUnregisterOptions = {}): Promise<OutgoingRegisterRequest> {
    // UAs MUST NOT send a new registration (that is, containing new Contact
    // header field values, as opposed to a retransmission) until they have
    // received a final response from the registrar for the previous one or
    // the previous REGISTER request has timed out.
    // https://tools.ietf.org/html/rfc3261#section-10.2
    if (this.waiting) {
      const error = new RequestPendingError("REGISTER request already in progress, waiting for final response");
      return Promise.reject(error);
    }

    if (this._state !== RegistererState.Registered && !options.all) {
      this.logger.warn("Not currently registered, but sending an unregister anyway.");
    }

    // Extra headers
    const extraHeaders = (options.requestOptions && options.requestOptions.extraHeaders || []).slice();
    this.request.extraHeaders = extraHeaders;

    // Registrations are soft state and expire unless refreshed, but can
    // also be explicitly removed.  A client can attempt to influence the
    // expiration interval selected by the registrar as described in Section
    // 10.2.1.  A UA requests the immediate removal of a binding by
    // specifying an expiration interval of "0" for that contact address in
    // a REGISTER request.  UAs SHOULD support this mechanism so that
    // bindings can be removed before their expiration interval has passed.
    //
    // The REGISTER-specific Contact header field value of "*" applies to
    // all registrations, but it MUST NOT be used unless the Expires header
    // field is present with a value of "0".
    // https://tools.ietf.org/html/rfc3261#section-10.2.2
    if (options.all) {
      extraHeaders.push("Contact: *");
      extraHeaders.push("Expires: 0");
    } else {
      extraHeaders.push("Contact: " + this.generateContactHeader(0));
    }

    // Call-ID: All registrations from a UAC SHOULD use the same Call-ID
    // header field value for registrations sent to a particular
    // registrar.
    //
    // CSeq: The CSeq value guarantees proper ordering of REGISTER
    // requests.  A UA MUST increment the CSeq value by one for each
    // REGISTER request with the same Call-ID.
    // https://tools.ietf.org/html/rfc3261#section-10.2
    this.request.cseq++;
    this.request.setHeader("cseq", this.request.cseq + " REGISTER");

    // Pre-emptively clear the registration timer to avoid a race condition where
    // this timer fires while waiting for a final response to the unsubscribe.
    if (this.registrationTimer !== undefined) {
      clearTimeout(this.registrationTimer);
      this.registrationTimer = undefined;
    }

    this.waitingToggle(true);

    const outgoingRegisterRequest = this.userAgent.userAgentCore.register(this.request, {
      onAccept: (response): void => {
        this._contacts = response.message.getHeaders("contact"); // Update contacts
        this.unregistered();
        if (options.requestDelegate && options.requestDelegate.onAccept) {
          options.requestDelegate.onAccept(response);
        }
        this.waitingToggle(false);
      },
      onProgress: (response): void => {
        if (options.requestDelegate && options.requestDelegate.onProgress) {
          options.requestDelegate.onProgress(response);
        }
      },
      onRedirect: (response): void => {
        this.logger.error("Unregister redirected. Not currently supported.");
        this.unregistered();
        if (options.requestDelegate && options.requestDelegate.onRedirect) {
          options.requestDelegate.onRedirect(response);
        }
        this.waitingToggle(false);
      },
      onReject: (response): void => {
        this.logger.error(`Unregister rejected with status code ${response.message.statusCode}`);
        this.unregistered();
        if (options.requestDelegate && options.requestDelegate.onReject) {
          options.requestDelegate.onReject(response);
        }
        this.waitingToggle(false);
      },
      onTrying: (response): void => {
        if (options.requestDelegate && options.requestDelegate.onTrying) {
          options.requestDelegate.onTrying(response);
        }
      }
    });

    return Promise.resolve(outgoingRegisterRequest);
  }

  /**
   * Clear registration timers.
   */
  private clearTimers(): void {
    if (this.registrationTimer !== undefined) {
      clearTimeout(this.registrationTimer);
      this.registrationTimer = undefined;
    }

    if (this.registrationExpiredTimer !== undefined) {
      clearTimeout(this.registrationExpiredTimer);
      this.registrationExpiredTimer = undefined;
    }
  }

  /**
   * Generate Contact Header
   */
  private generateContactHeader(expires: number): string {
    let contact = this.userAgent.contact.toString();
    if (this.options.regId && this.options.instanceId) {
      contact += ";reg-id=" + this.options.regId;
      contact += ';+sip.instance="<urn:uuid:' + this.options.instanceId + '>"';
    }

    if (this.options.extraContactHeaderParams) {
      this.options.extraContactHeaderParams.forEach((header: string) => {
        contact += ";" + header;
      });
    }

    contact += ";expires=" + expires;

    return contact;
  }

  /**
   * @deprecated
   */
  private onTransportDisconnected(): void {
    this.unregistered();
  }

  /**
   * Helper function, called when registered.
   */
  private registered(expires: number): void {
    this.clearTimers();

    // Re-Register before the expiration interval has elapsed.
    // For that, decrease the expires value. ie: 3 seconds
    this.registrationTimer = setTimeout(() => {
      this.registrationTimer = undefined;
      this.register();
    }, (expires * 1000) - 3000);

    // We are unregistered if the registration expires.
    this.registrationExpiredTimer = setTimeout(() => {
      this.logger.warn("Registration expired");
      this.unregistered();
    }, expires * 1000);

    if (this._state !== RegistererState.Registered) {
      this.stateTransition(RegistererState.Registered);
    }
  }

  /**
   * Helper function, called when unregistered.
   */
  private unregistered(): void {
    this.clearTimers();

    if (this._state !== RegistererState.Unregistered) {
      this.stateTransition(RegistererState.Unregistered);
    }
  }

  /**
   * Transition registration state.
   */
  private stateTransition(newState: RegistererState): void {
    const invalidTransition = () => {
      throw new Error(`Invalid state transition from ${this._state} to ${newState}`);
    };

    // Validate transition
    switch (this._state) {
      case RegistererState.Initial:
        if (
          newState !== RegistererState.Registered &&
          newState !== RegistererState.Unregistered
        ) {
          invalidTransition();
        }
        break;
      case RegistererState.Registered:
        if (
          newState !== RegistererState.Unregistered
        ) {
          invalidTransition();
        }
        break;
      case RegistererState.Unregistered:
        if (
          newState !== RegistererState.Registered
        ) {
          invalidTransition();
        }
        break;
      default:
        throw new Error("Unrecognized state.");
    }

    // Transition
    this._state = newState;
    this.logger.log(`Registration transitioned to state ${this._state}`);
    this._stateEventEmitter.emit("event", this._state);
  }

  /** True if the registerer is currently waiting for final response to a REGISTER request. */
  private get waiting(): boolean {
    return this._waiting;
  }

  /** Emits when the registerer waiting state changes. */
  private get waitingChange(): Emitter<boolean> {
    return makeEmitter(this._waitingEventEmitter);
  }

  /**
   * Toggle waiting.
   */
  private waitingToggle(waiting: boolean): void {
    if (this._waiting === waiting) {
      throw new Error(`Invalid waiting transition from ${this._waiting} to ${waiting}`);
    }
    this._waiting = waiting;
    this.logger.log(`Waiting toggled to ${this._waiting}`);
    this._waitingEventEmitter.emit("event", this._waiting);
  }
}
