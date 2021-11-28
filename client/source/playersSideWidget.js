"use strict"

const React = require("react")
const MobxReact = require("mobx-react")

const MainStore = require("mainStore.js")
const Common = require("common.js")

module.exports = @MobxReact.observer class PlayersSideWidget extends React.Component {
    constructor() {
        super()
    }

    onAddPlayersClicked(e) {
        MainStore.isPlayerMainWidgetEnabled = !MainStore.isPlayerMainWidgetEnabled
    }

    getPlayers() {
        let eventData = Common.getEventData()

        return eventData.setupData.players.map((data, i) => {
            let playerData = MainStore.playerData[data.id]
            if (playerData !== undefined) {
                return (
                    <div key={i}>
                        {`${i + 1}. ${playerData.firstName + " " + playerData.lastName}`}
                    </div>
                )
            }
        })
    }

    render() {
        return (
            <div className="playersSideWidget">
                <button className="addPlayersButton" onClick={(e) => this.onAddPlayersClicked(e)}>{MainStore.isPlayerMainWidgetEnabled ? "-" : "+"}</button>
                Players
                {this.getPlayers()}
            </div>
        )
    }
}
