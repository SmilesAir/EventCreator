"use strict"

const React = require("react")
const MobxReact = require("mobx-react")

const MainStore = require("mainStore.js")
const Common = require("common.js")

module.exports = MobxReact.observer(class PlayersSideWidget extends React.Component {
    constructor() {
        super()

        this.state = {
            isSideWidgetEnabled: false
        }
    }

    onAddPlayersClicked(e) {
        MainStore.isPlayerMainWidgetEnabled = !MainStore.isPlayerMainWidgetEnabled
    }

    getPlayers() {
        if (MainStore.eventData === undefined) {
            return null
        }

        let playerWidgets = []
        let sortedPlayers = []
        for (let playerKey in MainStore.eventData.eventData.playerData) {
            sortedPlayers.push({
                playerKey: playerKey,
                openPoints: Common.getPlayerRankingPointsByDivision(playerKey, "Open Pairs")
            })
        }

        sortedPlayers.sort((a, b) => {
            return b.openPoints - a.openPoints
        })

        for (let player of sortedPlayers) {
            let playerKey = player.playerKey
            let playerData = MainStore.playerData[playerKey]
            if (playerData !== undefined) {
                playerWidgets.push(
                    <div key={playerKey}>
                        {`${playerWidgets.length + 1}. ${playerData.firstName + " " + playerData.lastName} ${Common.getPlayerRankingPointsByDivision(playerKey, "Open Pairs")} / ${Common.getPlayerRankingPointsByDivision(playerKey, "Women Pairs")}`}
                    </div>
                )
            }
        }

        return playerWidgets
    }

    togglePlayersSideWidget() {
        this.state.isSideWidgetEnabled = !this.state.isSideWidgetEnabled
        this.setState(this.state)
    }

    render() {
        if (this.state.isSideWidgetEnabled) {
            return (
                <div className="playersSideWidget">
                    <button className="addPlayersButton" onClick={(e) => this.onAddPlayersClicked(e)}>{MainStore.isPlayerMainWidgetEnabled ? "-" : "+"}</button>
                    Players
                    {this.getPlayers()}
                </div>
            )
        } else {
            return (
                <div className="playersSideWidget collapsed">
                    <button onClick={() => this.togglePlayersSideWidget()}>{">"}</button>
                    <button className="addPlayersButton" onClick={(e) => this.onAddPlayersClicked(e)}>{MainStore.isPlayerMainWidgetEnabled ? "-" : "+"}</button>
                </div>
            )
        }
    }
})
