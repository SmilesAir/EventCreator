"use strict"

const MainStore = require("mainStore.js")
const Endpoints = require("endpoints.js")

let Common = module.exports

module.exports.fetchEx = function(key, pathParams, queryParams, options) {
    return fetch(Endpoints.buildUrl(key, pathParams, queryParams), options).then((response) => {
        return response.json()
    })
}

module.exports.downloadPlayerAndEventData = function() {
    Common.fetchEx("GET_PLAYER_DATA", {}, {}, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    }).then((data) => {
        MainStore.playerData = data.players

        console.log(data)
    }).catch((error) => {
        console.error(`Failed to download Player data: ${error}`)
    })
}

module.exports.getEventData = function() {
    return MainStore.eventList[MainStore.selectedEventIndex]
}

module.exports.getRoundNameFromNumber = function(number) {
    switch (number) {
    case 1:
        return "Finals"
    case 2:
        return "Semifinals"
    }
}

module.exports.onEventDataChanged = function() {

}
