import { readFileSync } from 'fs'
import { split, merge, times, fromPairs, init, last, toPairs, join } from 'ramda'

interface CityState {
    aliens: { city: CityState }[],
    roads: { north?: string, east?: string, south?: string, west?: string, }
}

const cityList = readFileSync('./world_map_medium.txt', 'utf8')
    .trim()
    .split('\n')
    //assume city names dont contain spaces
    .map(split(' '))
    .map(([city, ...roads])=> [city, {
        aliens: [],
        roads: fromPairs(roads.map(split('=')) as [string, string][])
    }] as [string, CityState])

const NUMBER_OF_ALIENS = parseInt(process.argv[2])

if (isNaN(NUMBER_OF_ALIENS)) {
    throw new Error('first argument must be the initial number of aliens');
}

const NUMBER_OF_CITIES = cityList.length

const initialState = fromPairs(cityList)
type WorldState = typeof initialState

const alienList = times(n => ({
    city: cityList[Math.floor(Math.random()*cityList.length)][1],
    toString(){ return 'alien ' + n; }
}), NUMBER_OF_ALIENS)


const step = (worldState: WorldState) => {
    // 'move' the aliens
    alienList.forEach(alien => {
        if (alien.city) {
            alien.city.aliens.push(alien)
        }
    });
    // resolve destruction
    for (let city in worldState){
        const { aliens, roads } = worldState[city]
        
        // assuming here that if >2 aliens are in a city they are all destroyed
        if (aliens.length > 1) {
            console.log(`${city} has been destroyed by ` +
            `${init(aliens).join(', ')} and ${last(aliens)}!`);

            // clear city and connected roads assuming every road out from a
            // city has exactly 1 opposite inroad (i.e. roads are straight)
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
            cityList.splice(cityList.findIndex($ =>
                $[1] === worldState[city]), 1)
            delete worldState[city]

            aliens.forEach(alien =>
                alienList.splice(alienList.indexOf(alien), 1))
        } else {
            // clear local alien list for re-calculating
            worldState[city].aliens = []
        }
    }
    // calculate movement
    alienList.forEach(alien => {
        const neighbouringCities = Object.keys(alien.city.roads)
            .map(road => worldState[alien.city.roads[road]])
            
        alien.city = neighbouringCities[
            Math.floor(Math.random()*neighbouringCities.length)
        ]
    })
    let i = alienList.length
    while (i--) if (!alienList[i].city) alienList.splice(i, 1)
}

for (let iterations = 0; iterations < 10000 && alienList.length; iterations++) {
    step(initialState)
}

// print out the remaining world
cityList.forEach(([city, cityState]) => {
    console.log(city, ...toPairs(cityState.roads).map(join('=')))
})