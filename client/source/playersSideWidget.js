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
        if (MainStore.eventData === undefined) {
            return null
        }

        let playerWidgets = []
        for (let playerKey in MainStore.eventData.eventData.playerData) {
            let playerData = MainStore.playerData[playerKey]
            if (playerData !== undefined) {
                playerWidgets.push(
                    <div key={playerKey}>
                        {`${playerWidgets.length + 1}. ${playerData.firstName + " " + playerData.lastName} ${Common.getPlayerRankingPointsByDivision(playerKey, "Open Pairs")}`}
                    </div>
                )
            }
        }

        return playerWidgets
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
