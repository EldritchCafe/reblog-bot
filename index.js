import assert from 'assert'
import {asyncFilter, asyncIterToArray, asyncSlice} from 'iter-tools'
import Mastodon from '@lagunehq/core'

const {MRB_INSTANCE_URL, MRB_ACCESS_TOKEN} = process.env

assert(MRB_INSTANCE_URL, 'MRB_INSTANCE_URL environment var is required')
assert(MRB_ACCESS_TOKEN, 'MWB_ACCESS_TOKEN environment var is required')

const MAXIMUM_FETCH_REQUESTS = 290
const MAXIMUM_REBLOG_REQUESTS = 3

main()

async function main() {
	const client = new Mastodon()

	client.setUrl(MRB_INSTANCE_URL)
	client.setToken(MRB_ACCESS_TOKEN)

	console.log(`Fetching statuses... (${MAXIMUM_FETCH_REQUESTS} requests maximum)`)

	const favouritedStatuses = await (
		fetchStatusesPages(client)
			|> asyncSlice(MAXIMUM_FETCH_REQUESTS)
			|> asyncFlatten
			|> asyncFilter(status => status.visibility === 'public' && status.favourites_count >= 2)
			|> asyncIterToArray
	)

	if (favouritedStatuses.length) {
		console.log(`Fetched ${favouritedStatuses.length} favourited statuses.\n`)

		// Threshold used to found interesting statuses to reblog.
		// Calculated from all fetched favourited statuses favourites count average
		const favouritesCountThreshold =
			favouritedStatuses.reduce((acc, status) => acc + status.favourites_count, 0) / favouritedStatuses.length

		const createdAtThreshold = Date.now() - (1000 * 60 * 60 * 24)

		console.log(`Favourites count threshold is ${favouritesCountThreshold}.`)
		console.log(`Created at threshold is ${createdAtThreshold.toString()}.\n`)

		const interestingStatuses = favouritedStatuses
			.filter(status => !status.reblogged
				&& status.favourites_count >= favouritesCountThreshold
				&& new Date(status.created_at) >= createdAtThreshold)

		console.log(`Found ${interestingStatuses.length} interesting statuses.\n`)

		console.log(`Reblog interesting statuses... (${MAXIMUM_REBLOG_REQUESTS} requests maximum)`)

		await Promise.all(
			interestingStatuses
				.reverse()
				.slice(0, MAXIMUM_REBLOG_REQUESTS)
				.map(status => client.reblogStatus(status.id))
		)

		console.log(`Done !`)
	} else {
		console.log(`Not enough favourited statuses.`)
	}
}

async function* fetchStatusesPages(client, maxId = null) {
	const statuses = await client.fetchPublicTimeline({
		limit: 40,
		max_id: maxId
	})

	yield statuses

	const [lastStatus] = statuses.slice(-1)

	if (lastStatus) {
		yield* fetchStatusesPages(client, lastStatus.id)
	}
}

async function* asyncFlatten(xs) {
	for await (const x of xs) {
		yield* x
	}
}
