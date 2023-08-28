/* eslint-disable no-alert */
"use strict"

const StringSimilarity = require("string-similarity")

const MainStore = require("mainStore.js")
const Endpoints = require("endpoints.js")

const poolKeyPrefix = "pool|"
const dataVersion = 1
let Common = module.exports

module.exports.divisionNames = [
    "Open Pairs",
    "Mixed Pairs",
    "Open Co-op",
    "Women Pairs"
]

module.exports.roundNames = [
    "Finals",
    "Semifinals",
    "Quarterfinals",
    "Preliminaries"
]

module.exports.poolNames = [
    "A",
    "B",
    "C",
    "D"
]

module.exports.fetchEx = function(key, pathParams, queryParams, options) {
    return fetch(Endpoints.buildUrl(key, pathParams, queryParams), options).then((response) => {
        return response.json()
    })
}

module.exports.uploadEventData = function() {
    let eventSummaryData = MainStore.eventSummaryData[MainStore.selectedEventKey]
    if (eventSummaryData === undefined) {
        alert("Can't find event summary data for selected event")
    }

    MainStore.eventData.key = MainStore.selectedEventKey
    MainStore.eventData.eventName = eventSummaryData.eventName

    console.log(JSON.parse(JSON.stringify(MainStore.eventData)))
    return Common.fetchEx("IMPORT_EVENT_DATA", { eventKey: MainStore.eventData.key }, undefined, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(MainStore.eventData)
    }).then((response) => {
        console.log(response)
    }).catch((error) => {
        console.error(`Trying to update event state "${error}"`)
    })
}

module.exports.downloadAndMerge = function() {
    if (MainStore.selectedEventKey === undefined) {
        return undefined
    }

    return Common.fetchEx("GET_EVENT_DATA", { eventKey: MainStore.selectedEventKey }, {}, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    }).then((data) => {
        console.log("GET_EVENT_DATA", data)

        mergePoolMap(data.eventData.eventData.poolMap, MainStore.eventData.eventData.poolMap)
        mergeEventProperties(data.eventData)
    }).catch((error) => {
        console.error(`Failed to download Event Data: ${error}`)
    })
}

function mergeEventProperties(newEventData) {
    let propsToCopy = [
        "dataVersion",
        "importantVersion",
        "minorVersion"
    ]
    for (let prop of propsToCopy) {
        let newProp = newEventData[prop]
        if (newProp !== undefined) {
            MainStore.eventData[prop] = newEventData[prop]
        }
    }
}

// Moves data from currentPoolMap into newPoolMap
function mergePoolMap(currentPoolMap, newPoolMap) {
    for (let poolKey in newPoolMap) {
        let newPoolData = newPoolMap[poolKey]
        let currentPoolData = currentPoolMap[poolKey]
        if (currentPoolData !== undefined) {
            for (let currentTeam of currentPoolData.teamData) {
                if (hasTeamResults(currentTeam)) {
                    let found = false
                    for (let newTeamIndex = 0; newTeamIndex < newPoolData.teamData.length; ++newTeamIndex) {
                        let newTeam = newPoolData.teamData[newTeamIndex]
                        if (hasSamePlayers(currentTeam, newTeam)) {
                            found = true
                            newPoolData.teamData[newTeamIndex] = currentTeam
                            break
                        }
                    }

                    if (!found) {
                        newPoolData.teamData.push(currentTeam)
                    }
                }
            }
        }
    }
}

function hasTeamResults(teamData) {
    return Object.keys(teamData.judgeData).length > 0
}

function hasSamePlayers(teamData1, teamData2) {
    if (teamData1.players.length !== teamData2.players.length) {
        return false
    }

    for (let i = 0; i < teamData1.players.length; ++i) {
        if (teamData1.players[i] !== teamData2.players[i]) {
            return false
        }
    }

    return true
}

module.exports.downloadAndReplace = function() {
    if (MainStore.selectedEventKey === undefined) {
        return undefined
    }

    return Common.fetchEx("GET_EVENT_DATA", { eventKey: MainStore.selectedEventKey }, {}, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    }).then((data) => {
        console.log("GET_EVENT_DATA", data)

        MainStore.eventData = data.eventData

    }).catch((error) => {
        console.error(`Failed to download Event Data: ${error}`)
    })
}

module.exports.downloadPlayerAndEventSummaryData = function() {
    return Common.fetchEx("GET_PLAYER_DATA", {}, {}, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    }).then((data) => {
        MainStore.playerData = data.players
        console.log("GET_PLAYER_DATA", data.players)

        MainStore.cachedFullNames = []
        for (let id in MainStore.playerData) {
            let playerData = MainStore.playerData[id]
            MainStore.cachedFullNames.push(playerData.firstName + " " + playerData.lastName)
        }
    }).catch((error) => {
        console.error(`Failed to download Player data: ${error}`)
    }).then(() => {
        return Common.fetchEx("GET_EVENT_SUMMARY_DATA", {}, {}, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        })
    }).then((data) => {
        MainStore.eventSummaryData = data.allEventSummaryData

        //console.log("GET_EVENT_SUMMARY_DATA", data.allEventSummaryData)
    }).catch((error) => {
        console.error(`Failed to download Event data: ${error}`)
    }).then(() => {
        return Common.fetchEx("GET_POINTS_DATA", {}, {}, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        })
    }).then((data) => {
        console.log("GET_POINTS_DATA", data)
        MainStore.pointsData = data.data
    }).catch((error) => {
        console.error(`Failed to download points data: ${error}`)
    })
}

module.exports.onEventDataChanged = function() {

}

module.exports.checkVersionAndPrompt = function() {
    if (MainStore.selectedEventKey === undefined || MainStore.eventData === undefined) {
        return new Promise()
    }

    return Common.fetchEx("GET_EVENT_VERSION", {
        eventKey: MainStore.selectedEventKey
    }, {}, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    }).then((data) => {
        if (data.importantVersion !== MainStore.eventData.importantVersion || data.minorVersion !== MainStore.eventData.minorVersion) {
            if (confirm("Out of date. Update?")) {
                return Common.downloadAndMerge()
            } else {
                return false
            }
        }

        return true
    }).then((result) => {
        return result !== false
    }).catch((error) => {
        throw new Error(error)
    })
}

module.exports.saveToLocalStorage = function() {
    localStorage.setItem("eventData", JSON.stringify(MainStore.eventData))
    localStorage.setItem("selectedEventKey", MainStore.selectedEventKey)
}

module.exports.loadFromLocalStorage = function() {
    MainStore.selectedEventKey = localStorage.getItem("selectedEventKey") || undefined
    let localStorageEventData = localStorage.getItem("eventData")
    MainStore.eventData = localStorageEventData && JSON.parse(localStorageEventData) || undefined

    if (MainStore.eventData !== undefined) {
        removeBadPoolData(MainStore.eventData.eventData.poolMap)

        Common.updateCachedRegisteredFullNames()
    }
}

function removeBadPoolData(poolMap) {
    for (let poolKey in poolMap) {
        if (poolKey.startsWith("pool|undefined|")) {
            delete poolMap[poolKey]
        }
    }
}

module.exports.updateCachedRegisteredFullNames = function() {
    MainStore.cachedRegisteredFullNames = []
    for (let id in MainStore.eventData.eventData.playerData) {
        let playerData = MainStore.playerData[id]
        MainStore.cachedRegisteredFullNames.push(playerData.firstName + " " + playerData.lastName)
    }
}

module.exports.createNewEventData = function(eventKey) {
    let eventSummaryData = MainStore.eventSummaryData[MainStore.selectedEventKey]
    if (eventSummaryData !== undefined) {
        let newEventData = {
            key: eventKey,
            eventName: eventSummaryData.eventName,
            dataVersion: dataVersion,
            importantVersion: 0,
            minorVersion: 0,
            eventData: {
                playerData: {},
                divisionData: {},
                poolMap: {}
            },
            eventState: {},
            controllerState: {},
            judgesState: {}
        }

        MainStore.eventData = newEventData
        MainStore.selectedEventKey = eventKey

        Common.saveToLocalStorage()
    } else {
        alert("Need to select event before creating a new EventData")
    }
}

module.exports.makePoolKey = function(eventKey, divisionName, roundName, poolName) {
    return `${poolKeyPrefix}${eventKey}|${divisionName}|${roundName}|${poolName}`
}

module.exports.findPlayerByFullName = function(inFullName) {
    for (let key in MainStore.playerData) {
        let playerData = MainStore.playerData[key]
        let fullName = playerData.firstName + " " + playerData.lastName
        if (inFullName === fullName) {
            return playerData
        }
    }

    return undefined
}

module.exports.getPlayerNameString = function(playerKey) {
    if (MainStore.playerData === undefined) {
        return "Unknown"
    }

    let playerData = MainStore.playerData[playerKey]
    let name = "Unknown"
    if (playerData !== undefined) {
        name = `${playerData.firstName} ${playerData.lastName}`
    }

    return name
}

module.exports.getPlayerNamesString = function(playerKeyArray) {
    if (MainStore.playerData === undefined) {
        return ""
    }

    return playerKeyArray.map((key) => {
        return Common.getPlayerNameString(key)
    }).join(" - ")
}

module.exports.getPlayerNameString = function(playerKey) {
    if (MainStore.playerData === undefined) {
        return "Unknown"
    }

    let playerData = MainStore.playerData[playerKey]
    let name = "Unknown"
    if (playerData !== undefined) {
        name = `${playerData.firstName} ${playerData.lastName}`
    }

    return name
}

module.exports.getSortedJudgeKeyArray = function(poolData) {
    if (poolData === undefined) {
        return []
    }

    let judges = []
    for (let judgeKey in poolData.judges) {
        judges.push({
            judgeKey: judgeKey,
            categoryType: poolData.judges[judgeKey]
        })
    }

    judges.sort((a, b) => {
        if (a.categoryType === b.categoryType) {
            return a.judgeKey.localeCompare(b.judgeKey)
        } else {
            return a.categoryType.localeCompare(b.categoryType)
        }
    })

    return judges.map((data) => data.judgeKey)
}

module.exports.poolDataContainsCompetitor = function(poolData, competitorKey) {
    if (poolData === undefined) {
        return false
    }

    for (let teamData of poolData.teamData) {
        if (teamData.players.find((key) => key === competitorKey) !== undefined) {
            return true
        }
    }

    return false
}

module.exports.poolDataContainsJudge = function(poolData, judgeKey) {
    return poolData && poolData.judges[judgeKey] !== undefined
}

module.exports.getMissingDivisionName = function() {
    if (MainStore.eventData === undefined) {
        return undefined
    }

    for (let divisionName of Common.divisionNames) {
        if (MainStore.eventData.eventData.divisionData[divisionName] === undefined) {
            return divisionName
        }
    }

    return undefined
}

module.exports.getMissingRoundName = function(divisionName) {
    if (MainStore.eventData === undefined) {
        return undefined
    }

    let divisionData = MainStore.eventData.eventData.divisionData[divisionName]

    for (let roundName of Common.roundNames) {
        if (divisionData.roundData[roundName] === undefined) {
            return roundName
        }
    }

    return undefined
}

module.exports.divisionHasPools = function(divisionName) {
    let divisionData = MainStore.eventData.eventData.divisionData[divisionName]
    if (divisionData && divisionData.roundData) {
        for (let roundName in divisionData.roundData) {
            if (Common.roundHasPools(divisionName, roundName)) {
                return true
            }
        }
    }

    return false
}

module.exports.roundHasPools = function(divisionName, roundName) {
    let divisionData = MainStore.eventData.eventData.divisionData[divisionName]
    let roundData = divisionData.roundData[roundName]
    if (roundData && roundData.poolNames.length > 0) {
        return true
    }

    return false
}

module.exports.getPoolDataContainingPlayer = function(playerKey) {
    for (let divisionName of Common.divisionNames) {
        for (let roundName of Common.roundNames) {
            for (let poolName of Common.poolNames) {
                let poolData = Common.getPoolData(divisionName, roundName, poolName)
                if (poolData !== undefined) {
                    if (Common.poolDataContainsCompetitor(poolData, playerKey)) {
                        return poolData
                    }
                    if (Common.poolDataContainsJudge(poolData, playerKey)) {
                        return poolData
                    }
                }
            }
        }
    }

    return undefined
}

module.exports.getPoolData = function(divisionName, roundName, poolName) {
    let poolKey = Common.makePoolKey(MainStore.eventData.key, divisionName, roundName, poolName)
    return MainStore.eventData.eventData.poolMap[poolKey]
}

module.exports.isPlayerPlayingInOtherPoolInRound = function(playerKey, divisionName, roundName, poolName) {
    let divisionData = MainStore.eventData.eventData.divisionData[divisionName]
    if (divisionData === undefined) {
        return false
    }

    let roundData = divisionData.roundData[roundName]
    if (roundData && roundData.poolNames.length === 0) {
        return false
    }

    for (let otherPoolName of roundData.poolNames) {
        if (otherPoolName !== poolName) {
            let otherPoolData = Common.getPoolData(divisionName, roundName, otherPoolName)
            if (Common.poolDataContainsCompetitor(otherPoolData, playerKey)) {
                return true
            }
        }
    }

    return false
}

module.exports.getPlayerJudgedCount = function(playerKey) {
    let count = 0
    for (let poolKey in MainStore.eventData.eventData.poolMap) {
        let poolData = MainStore.eventData.eventData.poolMap[poolKey]
        if (Common.poolDataContainsJudge(poolData, playerKey)) {
            ++count
        }
    }

    return count
}

module.exports.getPlayerRankingPointsByRankingName = function(playerKey, rankingName) {
    let pointsData = MainStore.pointsData[rankingName].find((data) => data.id === playerKey)
    return pointsData && pointsData.points || 0
}

module.exports.getPlayerRankingPointsByDivision = function(playerKey, divisionName) {
    let playerData = MainStore.playerData[playerKey]
    switch (divisionName) {
    case "Women Pairs":
        if (playerData.gender === "F") {
            return Common.getPlayerRankingPointsByRankingName(playerKey, "ranking-women")
        } else {
            return 0
        }
    case "Mixed Pairs":
        if (playerData.gender === "F") {
            return Common.getPlayerRankingPointsByRankingName(playerKey, "ranking-women")
        }
    }

    return Common.getPlayerRankingPointsByRankingName(playerKey, "ranking-open")
}

module.exports.getTeamRankingPointsByDivision = function(playerKeys, divisionName) {
    let sum = 0
    for (let playerKey of playerKeys) {
        sum += Common.getPlayerRankingPointsByDivision(playerKey, divisionName)
    }

    return sum
}

module.exports.getSimilarPlayerDataByName = function(name, nameList) {
    let bestNames = []
    const maxCount = 10
    for (let cachedName of nameList) {
        let similar = StringSimilarity.compareTwoStrings(name, cachedName)
        if (similar > 0) {
            if (bestNames.length < maxCount || similar > bestNames[maxCount - 1].score) {
                let index = bestNames.findIndex((data) => data.score < similar)
                bestNames.splice(index >= 0 ? index : bestNames.length, 0, {
                    name: cachedName,
                    score: similar
                })

                if (bestNames.length > maxCount) {
                    bestNames.pop()
                }
            }
        }
    }

    let playerDatas = []
    for (let data of bestNames) {
        playerDatas.push(Common.findPlayerByFullName(data.name))
    }

    return playerDatas
}

module.exports.getPlaceFromNumber = function(number) {
    switch (number) {
    case 1:
        return "1st"
    case 2:
        return "2nd"
    case 3:
        return "3rd"
    default:
        return `${number}th`
    }
}

module.exports.getPreviousRoundName = function(roundName) {
    let index = Common.roundNames.findIndex((name) => name === roundName)
    if (index < 0) {
        return undefined
    }

    return index + 1 < Common.roundNames.length ? Common.roundNames[index + 1] : undefined
}
