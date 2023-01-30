"use strict"

const MainStore = require("mainStore.js")
const Endpoints = require("endpoints.js")

const poolKeyPrefix = "pool|"
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

module.exports.fetchEx = function(key, pathParams, queryParams, options) {
    return fetch(Endpoints.buildUrl(key, pathParams, queryParams), options).then((response) => {
        return response.json()
    })
}

module.exports.uploadEventData = function() {
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

    }).catch((error) => {
        console.error(`Failed to download Event Data: ${error}`)
    })
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

module.exports.saveToLocalStorage = function() {
    localStorage.setItem("eventData", JSON.stringify(MainStore.eventData))
    localStorage.setItem("selectedEventKey", MainStore.selectedEventKey)
}

module.exports.loadFromLocalStorage = function() {
    MainStore.selectedEventKey = localStorage.getItem("selectedEventKey") || undefined
    MainStore.eventData = JSON.parse(localStorage.getItem("eventData") || undefined)

    removeBadPoolData(MainStore.eventData.eventData.poolMap)

    Common.updateCachedRegisteredFullNames()
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

module.exports.createNewEventData = function(eventKey, eventName) {
    let newEventData = {
        key: eventKey,
        eventName: eventName,
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
    for (let teamData of poolData.teamData) {
        if (teamData.players.find((key) => key === competitorKey) !== undefined) {
            return true
        }
    }

    return false
}

module.exports.poolDataContainsJudge = function(poolData, judgeKey) {
    return poolData.judges[judgeKey] !== undefined
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

module.exports.getPoolData = function(divisionName, roundName, poolName) {
    let poolKey = Common.makePoolKey(MainStore.eventData.key, divisionName, roundName, poolName)
    return MainStore.eventData.eventData.poolMap[poolKey]
}

module.exports.isPlayerPlayingInOtherPoolInRound = function(playerKey, divisionName, roundName, poolName) {
    let divisionData = MainStore.eventData.eventData.divisionData[divisionName]
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
