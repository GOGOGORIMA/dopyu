import { jsonOk, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/dal";
import { getCountryRanking, getUserRanking } from "@/lib/services/ranking";
import { parseRankingType, parseWorldCupSort } from "@/lib/validation";

/**
 * Yearly ranking API.
 *   GET /api/rankings?type=japan|world|worldcup&sort=average|volume
 *
 * Privacy: returns only aggregates (count and total volume).
 * Tags, completion times and user IDs are never included in the response.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const params = new URL(request.url).searchParams;
  const type = parseRankingType(params.get("type"));

  if (type === "worldcup") {
    return jsonOk(
      await getCountryRanking({
        sort: parseWorldCupSort(params.get("sort")),
        viewerCountryCode: user.countryCode,
      }),
    );
  }
  return jsonOk(await getUserRanking({ type, viewerId: user.id }));
}
