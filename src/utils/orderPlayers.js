import { playerApi } from '../api/modules/player';

export function mapOrderPlayers(slots) {
  if (!Array.isArray(slots)) return [];

  return slots.map((slot) => {
    const player = slot?.player && typeof slot.player === 'object' ? slot.player : {};
    const club = slot?.club && typeof slot.club === 'object' ? slot.club : {};

    return {
      id: slot?.playerId ?? player.id ?? slot?.id ?? '',
      name: slot?.playerName || player.name || slot?.name || '',
      club: slot?.clubName || player.clubName || club.name || '',
      acceptTime:
        slot?.acceptTime || slot?.acceptedAt || slot?.takenAt || slot?.playerAcceptedAt || '',
      transferTime:
        slot?.transferTime || slot?.transferredAt || slot?.assignedAt || slot?.assignTime || '',
    };
  });
}

export async function hydrateOrderPlayers(players) {
  return Promise.all(
    players.map(async (orderPlayer) => {
      if (!orderPlayer.id || (orderPlayer.name && orderPlayer.club)) return orderPlayer;

      try {
        const result = await playerApi.list({ id: orderPlayer.id, page: 1, pageSize: 1 });
        const player = Array.isArray(result?.list)
          ? result.list.find((item) => String(item.id) === String(orderPlayer.id))
          : null;

        if (!player) return orderPlayer;
        return {
          ...orderPlayer,
          name: orderPlayer.name || player.name || '',
          club: orderPlayer.club || player.clubName || '',
        };
      } catch {
        // 请求层已提示打手资料读取失败，保留订单详情中的 ID 和时间信息。
        return orderPlayer;
      }
    }),
  );
}
