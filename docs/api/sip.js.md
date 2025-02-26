<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [sip.js](./sip.js.md)

## sip.js package

A simple yet powerful API which takes care of SIP signaling and WebRTC media sessions for you.

## Classes

|  Class | Description |
|  --- | --- |
|  [Byer](./sip.js.byer.md) | A byer ends a [Session](./sip.js.session.md) (outgoing BYE). |
|  [Info](./sip.js.info.md) | An exchange of information (incoming INFO). |
|  [Infoer](./sip.js.infoer.md) | An Infoer sends [Info](./sip.js.info.md) (outgoing INFO). |
|  [Invitation](./sip.js.invitation.md) | An invitation is an offer to establish a [Session](./sip.js.session.md) (incoming INVITE). |
|  [Inviter](./sip.js.inviter.md) | An inviter offers to establish a [Session](./sip.js.session.md) (outgoing INVITE). |
|  [Message](./sip.js.message.md) | A received message (incoming MESSAGE). |
|  [Messager](./sip.js.messager.md) | A messager sends a [Message](./sip.js.message.md) (outgoing MESSAGE). |
|  [Notification](./sip.js.notification.md) | A notification of an event (incoming NOTIFY). |
|  [Publisher](./sip.js.publisher.md) | A publisher publishes a document (outgoing PUBLISH). |
|  [Referral](./sip.js.referral.md) | A request to establish a [Session](./sip.js.session.md) elsewhere (incoming REFER). |
|  [Referrer](./sip.js.referrer.md) | A referrer sends a [Referral](./sip.js.referral.md) (outgoing REFER). |
|  [Registerer](./sip.js.registerer.md) | A registerer registers a contact for an address of record (outgoing REGISTER). |
|  [RequestPendingError](./sip.js.requestpendingerror.md) | An exception indicating an outstanding prior request prevented execution. |
|  [Session](./sip.js.session.md) | A session provides real time communication between one or more participants. |
|  [Subscriber](./sip.js.subscriber.md) | A subscriber establishes a [Subscription](./sip.js.subscription.md) (outgoing SUBSCRIBE). |
|  [Subscription](./sip.js.subscription.md) | A subscription provides asynchronous [Notification](./sip.js.notification.md) of events. |
|  [UserAgent](./sip.js.useragent.md) | A user agent sends and receives requests using a <code>Transport</code>. |

## Enumerations

|  Enumeration | Description |
|  --- | --- |
|  [RegistererState](./sip.js.registererstate.md) | [Registerer](./sip.js.registerer.md) state. |
|  [SessionState](./sip.js.sessionstate.md) | [Session](./sip.js.session.md) state. |
|  [SIPExtension](./sip.js.sipextension.md) | SIP extension support level. |
|  [SubscriptionState](./sip.js.subscriptionstate.md) | [Subscription](./sip.js.subscription.md) state. |

## Interfaces

|  Interface | Description |
|  --- | --- |
|  [BodyAndContentType](./sip.js.bodyandcontenttype.md) | Message body content and type. |
|  [ByerByeOptions](./sip.js.byerbyeoptions.md) | Options for [Byer.bye()](./sip.js.byer.bye.md)<!-- -->. |
|  [ByerOptions](./sip.js.byeroptions.md) | Options for [Byer](./sip.js.byer.md) constructor. |
|  [Emitter](./sip.js.emitter.md) | Generic observable. |
|  [InfoerInfoOptions](./sip.js.infoerinfooptions.md) | Options for [Infoer.info()](./sip.js.infoer.info.md)<!-- -->. |
|  [InfoerOptions](./sip.js.infoeroptions.md) | Options for [Infoer](./sip.js.infoer.md) constructor. |
|  [InvitationAcceptOptions](./sip.js.invitationacceptoptions.md) | Options for [Invitation.accept()](./sip.js.invitation.accept.md)<!-- -->. |
|  [InvitationProgressOptions](./sip.js.invitationprogressoptions.md) | Options for [Invitation.progress()](./sip.js.invitation.progress.md)<!-- -->. |
|  [InvitationRejectOptions](./sip.js.invitationrejectoptions.md) | Options for [Invitation.reject()](./sip.js.invitation.reject.md)<!-- -->. |
|  [InviterCancelOptions](./sip.js.invitercanceloptions.md) | Options for [Inviter.cancel()](./sip.js.inviter.cancel.md)<!-- -->. |
|  [InviterInviteOptions](./sip.js.inviterinviteoptions.md) | Options for [Inviter.invite()](./sip.js.inviter.invite.md)<!-- -->. |
|  [InviterOptions](./sip.js.inviteroptions.md) | Options for [Inviter](./sip.js.inviter.md) constructor. |
|  [MessagerOptions](./sip.js.messageroptions.md) | Options for [Messager](./sip.js.messager.md) constructor. |
|  [PublisherOptions](./sip.js.publisheroptions.md) | Options for [Publisher](./sip.js.publisher.md) constructor. |
|  [PublisherPublishOptions](./sip.js.publisherpublishoptions.md) | Options for [Publisher.publish()](./sip.js.publisher.publish.md)<!-- -->. |
|  [PublisherUnpublishOptions](./sip.js.publisherunpublishoptions.md) | Options for [Publisher.unpublish()](./sip.js.publisher.unpublish.md)<!-- -->. |
|  [ReferrerDelegate](./sip.js.referrerdelegate.md) | Delegate for [Referrer](./sip.js.referrer.md)<!-- -->. |
|  [ReferrerOptions](./sip.js.referreroptions.md) | Options for [Referrer](./sip.js.referrer.md) constructor. |
|  [ReferrerReferOptions](./sip.js.referrerreferoptions.md) | Options for [Referrer.refer()](./sip.js.referrer.refer.md)<!-- -->. |
|  [RegistererOptions](./sip.js.registereroptions.md) | Options for [Registerer](./sip.js.registerer.md) constructor. |
|  [RegistererRegisterOptions](./sip.js.registererregisteroptions.md) | Options for [Registerer.register()](./sip.js.registerer.register.md)<!-- -->. |
|  [RegistererUnregisterOptions](./sip.js.registererunregisteroptions.md) | Options for [Registerer.unregister()](./sip.js.registerer.unregister.md)<!-- -->. |
|  [SessionDelegate](./sip.js.sessiondelegate.md) | Delegate for [Session](./sip.js.session.md)<!-- -->. |
|  [SessionDescriptionHandler](./sip.js.sessiondescriptionhandler.md) | Delegate for [Session](./sip.js.session.md) offer/answer exchange. |
|  [SessionDescriptionHandlerFactory](./sip.js.sessiondescriptionhandlerfactory.md) | Factory for [SessionDescriptionHandler](./sip.js.sessiondescriptionhandler.md)<!-- -->. |
|  [SessionDescriptionHandlerModifier](./sip.js.sessiondescriptionhandlermodifier.md) | Modifier for [SessionDescriptionHandler](./sip.js.sessiondescriptionhandler.md) offer/answer. |
|  [SessionDescriptionHandlerOptions](./sip.js.sessiondescriptionhandleroptions.md) | Options for [SessionDescriptionHandler](./sip.js.sessiondescriptionhandler.md) methods. |
|  [SessionInviteOptions](./sip.js.sessioninviteoptions.md) | Options for [Session.invite()](./sip.js.session.invite.md)<!-- -->. |
|  [SessionOptions](./sip.js.sessionoptions.md) | Options for [Session](./sip.js.session.md) constructor. |
|  [SubscriberOptions](./sip.js.subscriberoptions.md) | Options for [Subscriber](./sip.js.subscriber.md) constructor. |
|  [SubscriberSubscribeOptions](./sip.js.subscribersubscribeoptions.md) | Options for [Subscriber.subscribe()](./sip.js.subscriber.subscribe.md)<!-- -->. |
|  [SubscriptionDelegate](./sip.js.subscriptiondelegate.md) | Delegate for [Subscription](./sip.js.subscription.md)<!-- -->. |
|  [SubscriptionOptions](./sip.js.subscriptionoptions.md) | Options for [Subscription](./sip.js.subscription.md) constructor. |
|  [SubscriptionSubscribeOptions](./sip.js.subscriptionsubscribeoptions.md) | Options for [Subscription.subscribe()](./sip.js.subscription.subscribe.md)<!-- -->. |
|  [SubscriptionUnsubscribeOptions](./sip.js.subscriptionunsubscribeoptions.md) | Options for [Subscription.unsubscribe()](./sip.js.subscription.unsubscribe.md)<!-- -->. |
|  [UserAgentDelegate](./sip.js.useragentdelegate.md) | Delegate for [UserAgent](./sip.js.useragent.md)<!-- -->. |
|  [UserAgentOptions](./sip.js.useragentoptions.md) | Options for [UserAgent](./sip.js.useragent.md) constructor. |

## Variables

|  Variable | Description |
|  --- | --- |
|  [UserAgentRegisteredOptionTags](./sip.js.useragentregisteredoptiontags.md) | SIP Option Tags |

## Type Aliases

|  Type Alias | Description |
|  --- | --- |
|  [LogConnector](./sip.js.logconnector.md) | Log connector function. |
|  [LogLevel](./sip.js.loglevel.md) | Log level. |

