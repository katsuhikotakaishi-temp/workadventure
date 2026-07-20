import type { RoomConnection } from "../../Connection/RoomConnection";
import { iframeListener } from "../../Api/IframeListener";
import type { SendEventEvent } from "../../Api/Events/SendEventEvent";
import { BubbleNotification } from "../../Notification/BubbleNotification";
import { defaultOptions } from "../../Notification/Notification";
import { notificationManager } from "../../Notification/NotificationManager";

/**
 * Provides a bridge between scripts and the pusher server for events.
 */
export class ScriptingEventsManager {
    constructor(private roomConnection: RoomConnection) {
        // The variableMessageStream stream is completed in the RoomConnection. No need to unsubscribe.
        //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
        roomConnection.receivedEventMessageStream.subscribe(({ name, data, senderId }) => {
            if (
                name === "workadventure:doorbell" &&
                typeof data === "object" &&
                data !== null &&
                "senderName" in data &&
                typeof data.senderName === "string"
            ) {
                const options = {
                    ...defaultOptions,
                    body: `${data.senderName}さんが呼び鈴を鳴らしました`,
                    tag: "workadventure-doorbell",
                };
                notificationManager.createNotification(new BubbleNotification("呼び鈴", options));
            }

            // On server change, let's notify the iframes
            iframeListener.dispatchReceivedEvent({
                name: name,
                data: data,
                senderId: senderId,
            });
        });

        iframeListener.registerAnswerer("dispatchEvent", (event: SendEventEvent, source) => {
            return this.dispatchEvent(event, source);
        });
    }

    public async dispatchEvent(event: SendEventEvent, source: MessageEventSource | null): Promise<void> {
        // Dispatch to the room connection.
        await this.roomConnection.emitScriptableEvent(event.name, event.data, event.targetUserIds);

        // Dispatch to other iframes (only if we are part of the targets)
        /*if (event.targetUserIds === undefined || event.targetUserIds.includes(this.roomConnection.getUserId())) {
            iframeListener.dispatchScriptableEventToOtherIframes(
                event.name,
                event.data,
                this.roomConnection.getUserId(),
                source
            );
        }*/
    }

    public close(): void {
        iframeListener.unregisterAnswerer("dispatchEvent");
    }
}
