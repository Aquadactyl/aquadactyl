import http from "@/api/http";

export interface GameQuery {
  status: "available" | "pending" | "unavailable" | "unsupported";
  players: number | null;
  maxPlayers: number | null;
  checkedAt: Date | null;
}

export default async (uuid: string): Promise<GameQuery> => {
  const { data } = await http.get("/api/client/servers/" + uuid + "/query");
  return {
    status: data.attributes.status,
    players: data.attributes.players,
    maxPlayers: data.attributes.max_players,
    checkedAt: data.attributes.checked_at
      ? new Date(data.attributes.checked_at)
      : null,
  };
};
