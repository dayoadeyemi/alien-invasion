import { readFileSync } from 'fs'
import { split, merge, times, fromPairs, init, last, toPairs, join } from 'ramda'

interface CityState {
    name: string
    roads: { north?: string, east?: string, south?: string, west?: string, }
}

const cityList = readFileSync('./world_map_medium.txt', 'utf8')
    .trim()
    .split('\n')
    //assume city names dont contain spaces
    .map(split(' '))
    .map(([name, ...roads])=> [name, {
        name,
        roads: fromPairs(roads.map(split('=')) as [string, string][])
    }] as [string, CityState])

const NUMBER_OF_ALIENS = parseInt(process.argv[2])

if (isNaN(NUMBER_OF_ALIENS)) {
    throw new Error('first argument must be the initial number of aliens');
}

const NUMBER_OF_CITIES = cityList.length

const worldState = fromPairs(cityList)

const alienList = times(n => ({
    city: cityList[Math.floor(Math.random()*cityList.length)][1],
    toString(){ return 'alien ' + n; }
}), NUMBER_OF_ALIENS)

/**
 * clear city and connected roads assuming every road out from a
 * city has exactly 1 opposite inroad (i.e. roads are straight)
 * @param cityState 
 */
const destroyCity = (cityState: CityState) => {
    const { roads } = cityState

    for (let road in roads){
        const inRoad = {
            north: 'south',
            east: 'west',
            south: 'north',
            west: 'east'
        }[road]
        const neighbourCityState = worldState[roads[road]]
        delete neighbourCityState.roads[inRoad]
    }
    delete worldState[cityState.name]
}

/**
 * Main iteration step. Assumes aliens *must* move to a neighbouring city if 
 * they can
 * 
 * In general,  #aliens < #cities (as otherwise the aliens will just
 * kill each other, and in next step #aliens < #cities) so prefer to iterate
 * over aliens
 */
const step = () => {
    const aliensByCity = new Map<CityState, { city: CityState }[]>()

    const citiesToDestroy = [] as CityState[]

    // calculate destruction
    for (let i = alienList.length; i--;) {
        const alien = alienList[i]
        const aliens = aliensByCity.get(alien.city)
        if (aliens) {
            aliens.push(alien)
            // there are already aliens in this city so this alien will be
            // killed by it
            alienList.splice(i, 1)

            // make sure the first alien dies and the city is destroyed
            if (aliens.length === 2) {
                citiesToDestroy.push(alien.city)
                alienList.splice(alienList.indexOf(aliens[0]), 1)
            }
        }
        else {
            aliensByCity.set(alien.city, [alien])
        }
    };

    // destroy cities
    for (let city of citiesToDestroy){
        const aliens = aliensByCity.get(city)
        console.log(`${city.name} has been destroyed by ` +
        `${init(aliens).join(', ')} and ${last(aliens)}!`);

        destroyCity(city)
    }

    // calculate movement
    for (let i = alienList.length; i--;) {
        
        const neighbouringCities = Object.keys(alienList[i].city.roads)
            .map(road => worldState[alienList[i].city.roads[road]])
        
        // if there is no neighbouring city the alien is trapped!
        // no need to process is any more
        if (neighbouringCities.length === 0) {
            alienList.splice(i, 1)
            continue
        }

        // calculate movement
        alienList[i].city = neighbouringCities[
            Math.floor(Math.random()*neighbouringCities.length)
        ]
    }
}

// Run until all the aliens have been destroyed, or each alien has moved at
// least 10,000 times
for (let iterations = 0; iterations < 10000 && alienList.length; iterations++) step()

// print out the remaining world
for (let city in worldState) {
    console.log(city, ...toPairs(worldState[city].roads).map(join('=')))
}