import { orderApi } from './modules/order';
import { sendNotifySocketMessage, subscribeNotifySocket } from './notifySocket';

const consumers = new Map();
const fallbackIntervalMs = 15000;
let nextConsumerId = 0;
let unsubscribeSocket = null;
let socketConnected = false;
let socketMode = '';
let fallbackInterval = null;
let fallbackDebounce = null;
let fallbackInFlight = false;
let lastFallbackError = '';

function getWatch() {
  const claimConsumer = [...consumers.values()].find((consumer) => consumer.kind === 'claimHall');
  const orderConsumer = [...consumers.values()].find((consumer) => consumer.kind === 'orderList');
  return {
    type: 'ORDER_FEED_WATCH',
    claimSinceId: claimConsumer?.sinceId ?? null,
    orderListSinceId: orderConsumer?.sinceId ?? null,
    orderListScope: orderConsumer?.scope || 'ALL',
  };
}

function hasBaseline(watch = getWatch()) {
  return watch.claimSinceId != null || watch.orderListSinceId != null;
}

function setCount(kind, value) {
  const count = Number(value);
  if (!Number.isFinite(count) || count < 0) return;
  consumers.forEach((consumer) => {
    if (consumer.kind === kind) consumer.onCount(Math.floor(count));
  });
}

function handleFeed(raw) {
  const result = raw?.payload ?? raw?.data ?? raw;
  const claimCount = result?.claimHall?.newCount;
  const orderCount = result?.orderList?.newCount;
  if (claimCount != null) setCount('claimHall', claimCount);
  if (orderCount != null) setCount('orderList', orderCount);
}

function stopFallbackPolling() {
  if (fallbackInterval) clearInterval(fallbackInterval);
  if (fallbackDebounce) clearTimeout(fallbackDebounce);
  fallbackInterval = null;
  fallbackDebounce = null;
}

async function pollFeed() {
  if (socketConnected || fallbackInFlight || !consumers.size) return;
  const watch = getWatch();
  if (!hasBaseline(watch)) return;
  fallbackInFlight = true;
  try {
    const result = await orderApi.feedNew({
      claimSinceId: watch.claimSinceId,
      orderListSinceId: watch.orderListSinceId,
      orderListScope: watch.orderListScope,
    });
    lastFallbackError = '';
    handleFeed(result);
  } catch (error) {
    const message = error?.message || 'HTTP 新数据查询失败';
    if (message !== lastFallbackError) {
      console.warn('[order-feed] HTTP fallback failed:', message);
      lastFallbackError = message;
    }
  } finally {
    fallbackInFlight = false;
  }
}

function startFallbackPolling() {
  if (socketConnected || !consumers.size || !hasBaseline()) return;
  if (!fallbackInterval) {
    pollFeed();
    fallbackInterval = setInterval(pollFeed, fallbackIntervalMs);
  }
}

function scheduleFallbackPoll() {
  if (socketConnected || !hasBaseline()) return;
  if (fallbackInterval) {
    if (fallbackDebounce) clearTimeout(fallbackDebounce);
    fallbackDebounce = setTimeout(() => {
      fallbackDebounce = null;
      pollFeed();
    }, 100);
  }
  startFallbackPolling();
}

function sendWatch() {
  if (!socketConnected || !hasBaseline()) return;
  if (!sendNotifySocketMessage(getWatch())) {
    socketConnected = false;
    startFallbackPolling();
  }
}

function ensureSocketSubscription() {
  if (unsubscribeSocket) return;
  unsubscribeSocket = subscribeNotifySocket({
    onMessage: handleFeed,
    onStatus: (status, mode) => {
      socketMode = mode || '';
      socketConnected = status === 'connected' && socketMode === 'ws';
      if (socketConnected) {
        stopFallbackPolling();
        sendWatch();
      } else {
        startFallbackPolling();
      }
    },
  });
}

export function subscribeOrderFeed(kind, onCount) {
  if (kind !== 'claimHall' && kind !== 'orderList') {
    throw new Error(`Unsupported order feed kind: ${kind}`);
  }
  if (typeof onCount !== 'function') {
    throw new TypeError('Order feed subscriber requires an onCount callback');
  }

  const id = ++nextConsumerId;
  consumers.set(id, {
    kind,
    onCount,
    sinceId: null,
    scope: 'ALL',
  });
  ensureSocketSubscription();

  return {
    update({ sinceId, scope } = {}) {
      const consumer = consumers.get(id);
      if (!consumer) return;
      consumer.sinceId = sinceId == null ? null : sinceId;
      if (kind === 'orderList' && (scope === 'ALL' || scope === 'MINE')) {
        consumer.scope = scope;
      }
      sendWatch();
      scheduleFallbackPoll();
    },
    close() {
      consumers.delete(id);
      if (consumers.size) {
        sendWatch();
        scheduleFallbackPoll();
        return;
      }
      stopFallbackPolling();
      socketConnected = false;
      socketMode = '';
      if (unsubscribeSocket) {
        unsubscribeSocket();
        unsubscribeSocket = null;
      }
    },
  };
}
