"use strict"

const Mobx = require("mobx")

module.exports = Mobx.observable({
    selectedEventKey: undefined,
    eventData: undefined,
    isPlayerMainWidgetEnabled: false,
    playerData: {},
    eventSummaryData: undefined,
    pointsData: undefined,
    cachedFullNames: [],
    cachedRegisteredFullNames: []
})
