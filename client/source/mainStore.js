"use strict"

const Mobx = require("mobx")

let testData = JSON.parse("{\"eventId\":\"123-123\",\"players\":[{\"id\":\"f7e9c85f-da3b-427c-95f2-c0a5e809004e\"}],\"divisions\":[{\"name\":\"Open Pairs\",\"rounds\":[{\"roundNumber\":1,\"routineLengthSeconds\":180,\"pools\":[{\"name\":\"A\",\"teams\":[{\"players\":[\"123-123\",\"123-123\"]}],\"judges\":[{\"playerId\":\"123-123\",\"category\":\"diff\"}]}]}]}]}")

module.exports = Mobx.observable({
    selectedEventIndex: 0,
    eventList: [{
        eventId: "123-123",
        eventName: "Test Event",
        setupData: testData
    }],
    isPlayerMainWidgetEnabled: true,
    playerData: {},
    cachedFullNames: []
})
