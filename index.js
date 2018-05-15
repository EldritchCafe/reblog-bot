const assert = require('assert')
const Mastodon = require('@lagunehq/core')

const {MRB_INSTANCE_DOMAIN, MRB_ACCESS_TOKEN} = process.env

assert(MRB_INSTANCE_DOMAIN, 'MRB_INSTANCE_DOMAIN environment var is required')
assert(MRB_ACCESS_TOKEN, 'MWB_ACCESS_TOKEN environment var is required')

main()

async function main() {
	const client = new Mastodon.default()

	client.setUrl(`https://${MRB_INSTANCE_DOMAIN}`)
	client.setToken(MRB_ACCESS_TOKEN)

	// TODO: replace Array.prototype methods by more efficent functions using iterators

	// fetch public favourited statuses
	// TODO: need to fetch moar statuses !
	// NOTE: oh, and should use public timeline instead of home timeline ofc
	const statuses = (await client.fetchHomeTimeline({ limit: 40 }))
		.filter(status => status.visibility === 'public') // useless on public timeline
		.filter(status => status.favourites_count > 0)

	// threshold used to choose interesting statuses to reblog
	const average = statuses.reduce((a, status) => a + status.favourites_count, 0) / statuses.length

	// not already reblogged recent statuses
	// TODO: filter by date
	const candidateStatuses = statuses
		.filter(status => !status.reblogged)

	// yaaay, these statuses seems interesting because they have better favourited count than our average threshold
	const interestingStatuses = candidateStatuses
		.filter((status) => status.favourites_count >= average)

	// reblog all interestingStatuses in parallel
	// await Promise.all(interestingStatuses.map(status => client.reblogStatus(status.id)))
}
