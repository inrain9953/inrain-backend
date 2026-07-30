const { supabase } = require('./DbConnect')

const TRAVEL_TABLE = 'Travel'
const TRIP_TABLE = 'Trip'

async function saveTravel (payload, points) {
  const { data, error } = await supabase
    .from(TRAVEL_TABLE)
    .insert(payload)
    .select()
    .single()

  if (error) throw error

  const tripRow = {
    trip_id: payload.id,
    latitude: points.map(p => p.latitude),
    longitude: points.map(p => p.longitude),
    accuracy: points.map(p => p.accuracy),
    timestamp: points.map(p => p.timestamp)
  }

  const { error: tripError } = await supabase.from(TRIP_TABLE).insert(tripRow)

  if (tripError) {
    // roll back the orphaned Travel row
    await supabase.from(TRAVEL_TABLE).delete().eq('id', payload.id)
    throw tripError
  }

  return data
}

async function getTravelByUserID (userId) {
  const { data, error } = await supabase
    .from(TRAVEL_TABLE)
    .select('*')
    .eq('User_ID', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data
}

module.exports = { saveTravel, getTravelByUserID }
