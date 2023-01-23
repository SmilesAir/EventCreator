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

module.exports.downloadPlayerAndEventData = function() {
    return Common.fetchEx("GET_PLAYER_DATA", {}, {}, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    }).then((data) => {
        MainStore.playerData = data.players

        MainStore.cachedFullNames = []
        for (let id in MainStore.playerData) {
            let playerData = MainStore.playerData[id]
            MainStore.cachedFullNames.push(playerData.firstName + " " + playerData.lastName)
        }

        console.log(data)
    }).catch((error) => {
        console.error(`Failed to download Player data: ${error}`)
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

    Common.updateCachedRegisteredFullNames()

    console.log(MainStore.eventData, MainStore.cachedRegisteredFullNames)
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
