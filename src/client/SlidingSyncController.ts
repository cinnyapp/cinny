import { MatrixClient, ClientEvent, EventType, Room } from "matrix-js-sdk/src/matrix";
import {
    MSC3575Filter,
    MSC3575List,
    MSC3575SlidingSyncResponse,
    MSC3575_STATE_KEY_LAZY,
    MSC3575_STATE_KEY_ME,
    MSC3575_WILDCARD,
    SlidingSync,
    SlidingSyncEvent,
    SlidingSyncState,
} from "matrix-js-sdk/src/sliding-sync";
import { logger } from "matrix-js-sdk/src/logger";
import { sleep } from "matrix-js-sdk/src/utils";

const SYNC_TIMEOUT_MS = 20000;
const INITIAL_SYNC_TIMEOUT_MS = 1000;

/** * Core state events required across the application for proper rendering.
 * Includes standard room metadata, VoIP, and MSC2545 emotes/stickers.
 */
const BASE_STATE_REQUIREMENTS = [
    [EventType.RoomJoinRules, ""],
    [EventType.RoomAvatar, ""],
    [EventType.RoomCanonicalAlias, ""],
    [EventType.RoomTombstone, ""],
    [EventType.RoomEncryption, ""],
    [EventType.RoomCreate, ""],
    [EventType.SpaceChild, MSC3575_WILDCARD],
    [EventType.SpaceParent, MSC3575_WILDCARD],
    [EventType.RoomMember, MSC3575_STATE_KEY_ME],
    [EventType.RoomPowerLevels, ""],

    // Call / VoIP Metadata
    ["org.matrix.msc3401.call", MSC3575_WILDCARD],
    ["org.matrix.msc3401.call.member", MSC3575_WILDCARD],
    ["m.call", MSC3575_WILDCARD],
    ["m.call.member", MSC3575_WILDCARD],

    // Custom Emotes & Stickers
    ["im.ponies.room_emotes", MSC3575_WILDCARD],
    ["im.ponies.user_emotes", MSC3575_WILDCARD],
    ["m.image_pack", MSC3575_WILDCARD],
    ["m.image_pack.aggregate", MSC3575_WILDCARD],
];

const SUBSCRIPTION_BASE = {
    timeline_limit: 50,
    include_old_rooms: {
        timeline_limit: 0,
        required_state: BASE_STATE_REQUIREMENTS,
    },
};

const SUBSCRIPTIONS = {
    UNENCRYPTED: {
        ...SUBSCRIPTION_BASE,
        required_state: [
            [EventType.RoomMember, MSC3575_STATE_KEY_ME],
            [EventType.RoomMember, MSC3575_STATE_KEY_LAZY],
        ],
    },
    ENCRYPTED: {
        ...SUBSCRIPTION_BASE,
        required_state: [[MSC3575_WILDCARD, MSC3575_WILDCARD]],
    }
};

const UNENCRYPTED_SUB_KEY = "unencrypted_lazy_load";

const INITIAL_LIST_CONFIGS: Record<string, MSC3575List> = {
    spaces: {
        ranges: [[0, 10]],
        timeline_limit: 0,
        required_state: BASE_STATE_REQUIREMENTS,
        include_old_rooms: SUBSCRIPTION_BASE.include_old_rooms,
        filters: { room_types: ["m.space"] },
    },
    invites: {
        ranges: [[0, 10]],
        timeline_limit: 1,
        required_state: BASE_STATE_REQUIREMENTS,
        include_old_rooms: SUBSCRIPTION_BASE.include_old_rooms,
        filters: { is_invite: true },
    },
    favourites: {
        ranges: [[0, 10]],
        timeline_limit: 1,
        required_state: BASE_STATE_REQUIREMENTS,
        include_old_rooms: SUBSCRIPTION_BASE.include_old_rooms,
        filters: { tags: ["m.favourite"] },
    },
    dms: {
        ranges: [[0, 10]],
        timeline_limit: 1,
        required_state: BASE_STATE_REQUIREMENTS,
        include_old_rooms: SUBSCRIPTION_BASE.include_old_rooms,
        filters: { is_dm: true, is_invite: false, not_tags: ["m.favourite", "m.lowpriority"] },
    },
    untagged: {
        ranges: [[0, 10]],
        timeline_limit: 1,
        required_state: BASE_STATE_REQUIREMENTS,
        include_old_rooms: SUBSCRIPTION_BASE.include_old_rooms,
    },
};

export type SyncListUpdatePayload = {
    filters?: MSC3575Filter;
    sort?: string[];
    ranges?: [number, number][];
};


export const synchronizeGlobalEmotes = async (client: MatrixClient) => {
    const emoteEvent = client.getAccountData('im.ponies.emote_rooms');
    if (!emoteEvent) return;

    const rooms = Object.keys(emoteEvent.getContent()?.rooms || {});
    const syncInstance = SlidingSyncController.getInstance().syncInstance;

    if (rooms.length > 0 && syncInstance) {
        const activeSubs = syncInstance.getRoomSubscriptions();
        rooms.forEach((id) => activeSubs.add(id));
        syncInstance.modifyRoomSubscriptions(activeSubs);
        logger.debug(`[SlidingSync] Subscribed to ${rooms.length} global emote rooms.`);
    }
};

export class SlidingSyncController {
    public static isSupportedOnServer: boolean = false;

    private static instance: SlidingSyncController;
    public syncInstance?: SlidingSync;
    private matrixClient?: MatrixClient;
    private initializationPromise = Promise.withResolvers<void>();

    private constructor() {}

    public static getInstance(): SlidingSyncController {
        if (!SlidingSyncController.instance) {
            SlidingSyncController.instance = new SlidingSyncController();
        }
        return SlidingSyncController.instance;
    }

    /**
     * Initializes the SlidingSync instance and triggers background list population.
     */
    public async initialize(client: MatrixClient): Promise<SlidingSync> {
        this.matrixClient = client;

        const configuredLists = new Map(Object.entries(INITIAL_LIST_CONFIGS));

        this.syncInstance = new SlidingSync(
            client.baseUrl,
            configuredLists,
            SUBSCRIPTIONS.ENCRYPTED,
            client,
            INITIAL_SYNC_TIMEOUT_MS
        );

        this.syncInstance.addCustomSubscription(UNENCRYPTED_SUB_KEY, SUBSCRIPTIONS.UNENCRYPTED);
        this.initializationPromise.resolve();

        logger.info(`[SlidingSync] Activated at ${client.baseUrl}`);
        this.executeBackgroundSpidering(100, 0);

        return this.syncInstance;
    }

    /**
     * Creates or updates a specific UI list in the sync request.
     */
    public async configureList(listId: string, payload: SyncListUpdatePayload): Promise<MSC3575List> {
        await this.initializationPromise.promise;
        if (!this.syncInstance) throw new Error("Sync instance not initialized");

        const existingList = this.syncInstance.getListParams(listId);

        if (existingList && payload.ranges && Object.keys(payload).length === 1) {
            await this.syncInstance.setListRanges(listId, payload.ranges);
            return this.syncInstance.getListParams(listId)!;
        }

        const mergedList: MSC3575List = existingList ? { ...existingList, ...payload } : {
            ranges: [[0, 50]],
            sort: ["by_notification_level", "by_recency"],
            timeline_limit: 1,
            required_state: [
                [EventType.RoomJoinRules, ""],
                [EventType.RoomAvatar, ""],
                [EventType.RoomTombstone, ""],
                [EventType.RoomEncryption, ""],
                [EventType.RoomCreate, ""],
                [EventType.RoomMember, MSC3575_STATE_KEY_ME],
            ],
            include_old_rooms: {
                timeline_limit: 0,
                required_state: [
                    [EventType.RoomCreate, ""],
                    [EventType.RoomTombstone, ""],
                    [EventType.SpaceChild, MSC3575_WILDCARD],
                    [EventType.SpaceParent, MSC3575_WILDCARD],
                    [EventType.RoomMember, MSC3575_STATE_KEY_ME],
                ],
            },
            ...payload,
        };

        if (JSON.stringify(existingList) !== JSON.stringify(mergedList)) {
            try {
                await this.syncInstance.setList(listId, mergedList);
            } catch (error) {
                logger.error(`[SlidingSync] Failed to configure list ${listId}:`, error);
            }
        }

        return this.syncInstance.getListParams(listId)!;
    }

    /**
     * Forces immediate state population when a user explicitly navigates to a room.
     */
    public async focusRoom(roomId: string): Promise<void> {
        await this.initializationPromise.promise;
        if (!this.syncInstance || !this.matrixClient) return;

        const subs = this.syncInstance.getRoomSubscriptions();
        if (subs.has(roomId)) return;

        subs.add(roomId);
        const roomContext = this.matrixClient.getRoom(roomId);
        
        // Lazy load members if the room is unencrypted to save bandwidth
        const isEncrypted = await this.matrixClient.getCrypto()?.isEncryptionEnabledInRoom(roomId);
        if (!isEncrypted) {
            this.syncInstance.useCustomSubscription(roomId, UNENCRYPTED_SUB_KEY);
        }

        this.syncInstance.modifyRoomSubscriptions(subs);

        // Wait for the JS SDK to emit the room if it's completely new to the client
        if (!roomContext) {
            await new Promise<void>((resolve) => {
                const onRoomAdded = (r: Room) => {
                    if (r.roomId === roomId) {
                        this.matrixClient?.off(ClientEvent.Room, onRoomAdded);
                        resolve();
                    }
                };
                this.matrixClient?.on(ClientEvent.Room, onRoomAdded);
            });
        }
    }

    /**
     * Checks if the homeserver advertises native MSC3575 simplified support.
     */
    public async verifyServerSupport(client: MatrixClient): Promise<boolean> {
        const isSupported = await client?.doesServerSupportUnstableFeature("org.matrix.simplified_msc3575");
        SlidingSyncController.isSupportedOnServer = !!isSupported;
        
        if (isSupported) {
            logger.debug("[SlidingSync] Native org.matrix.simplified_msc3575 support detected.");
        }
        return SlidingSyncController.isSupportedOnServer;
    }

    /**
     * Incrementally expands list ranges to fetch all user rooms in the background.
     */
    private executeBackgroundSpidering(batchLimit: number, delayMs: number): void {
        if (!this.syncInstance) return;

        const boundsTracker = new Map<string, number>(
            Object.keys(INITIAL_LIST_CONFIGS).map(key => [key, INITIAL_LIST_CONFIGS[key].ranges[0][1]])
        );

        const handleSyncLifecycle = async (state: SlidingSyncState, _: MSC3575SlidingSyncResponse | null, err?: Error) => {
            if (state !== SlidingSyncState.Complete) return;
            
            await sleep(delayMs);
            if (err) return;

            let expansionsOccurred = false;

            for (const [listName, currentBound] of boundsTracker.entries()) {
                const totalAvailable = this.syncInstance?.getListData(listName)?.joinedCount || 0;
                
                if (currentBound < totalAvailable) {
                    const expandedBound = currentBound + batchLimit;
                    boundsTracker.set(listName, expandedBound);
                    this.syncInstance?.setListRanges(listName, [[0, expandedBound]]);
                    expansionsOccurred = true;
                }
            }

            // Unsubscribe once all lists have fully paginated
            if (!expansionsOccurred) {
                this.syncInstance?.off(SlidingSyncEvent.Lifecycle, handleSyncLifecycle);
                logger.debug("[SlidingSync] Background spidering complete.");
            }
        };

        this.syncInstance.on(SlidingSyncEvent.Lifecycle, handleSyncLifecycle);
    }
}
