"use strict"

let urls = {
    IMPORT_EVENT_DATA: "https://xf4cu1wy10.execute-api.us-west-2.amazonaws.com/production/importEventFromEventCreator/<eventKey>",
    GET_PLAYER_DATA: "https://4wnda3jb78.execute-api.us-west-2.amazonaws.com/production/getAllPlayers",
    GET_POINTS_MANIFEST: "https://kvq5a3et4b.execute-api.us-west-2.amazonaws.com/production/getManifest",
    GET_EVENT_SUMMARY_DATA: "https://wyach4oti8.execute-api.us-west-2.amazonaws.com/production/getAllEvents",
    GET_EVENT_DATA: "https://xf4cu1wy10.execute-api.us-west-2.amazonaws.com/production/getEventData/<eventKey>",
    GET_POINTS_DATA: "https://kvq5a3et4b.execute-api.us-west-2.amazonaws.com/production/downloadLatestPointsData",
    GET_EVENT_VERSION: "https://xf4cu1wy10.execute-api.us-west-2.amazonaws.com/production/getEventDataVersion/<eventKey>",
    ADD_PLAYER: "https://4wnda3jb78.execute-api.us-west-2.amazonaws.com/production/addPlayer/<firstName>/lastName/<lastName>"
}

module.exports.buildUrl = function(key, pathParams, queryParams) {
    let url = urls[key]
    for (let wildName in pathParams) {
        url = url.replace(`<${wildName}>`, encodeURIComponent(pathParams[wildName]))
    }

    let firstQueryParam = true
    for (let paramName in queryParams) {
        let prefix = firstQueryParam ? "?" : "&"
        firstQueryParam = false

        url += `${prefix}${paramName}=${queryParams[paramName]}`
    }

    return url
}
