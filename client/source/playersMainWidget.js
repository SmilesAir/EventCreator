/* eslint-disable no-loop-func */
"use strict"

const React = require("react")
const MobxReact = require("mobx-react")

const MainStore = require("mainStore.js")
const Common = require("common.js")

require("playersMainWidget.less")

module.exports = @MobxReact.observer class PlayerMainWidget extends React.Component {
    constructor() {
        super()

        this.state = {
            inputText: "",
            inputPlayerMatches: []
        }

        setTimeout(() => {
            this.onInputTextChanged({
                target: {
                    value: "Ryan Young\nEmma Kahle"
                }
            })
        }, 1000)
    }

    onInputTextChanged(e) {
        this.state.inputText = e.target.value

        this.state.inputPlayerMatches = []

        let eventData = Common.getEventData()
        let lines = this.state.inputText.split("\n")
        for (let line of lines) {
            line = line.trim()
            if (line.length > 0) {
                let foundExactMatch = false
                for (let id in MainStore.playerData) {
                    let playerData = MainStore.playerData[id]
                    let fullName = playerData.firstName + " " + playerData.lastName
                    if (line === fullName) {
                        this.state.inputPlayerMatches.push({
                            id: playerData.key,
                            fullName: playerData.firstName + " " + playerData.lastName,
                            isExactMatch: true,
                            isAdded: eventData.setupData.players.find((player) => player.id === playerData.key) !== undefined
                        })

                        foundExactMatch = true
                        break
                    }
                }

                if (!foundExactMatch) {
                    this.state.inputPlayerMatches.push({
                        fullName: line,
                        isExactMatch: false,
                        isAdded: false
                    })
                }
            }
        }

        this.updatePlayerMatches()

        this.setState(this.state)
    }

    updatePlayerMatches() {
        this.state.inputPlayerMatches = this.state.inputPlayerMatches.sort((a, b) => {
            if (a.isAdded && !b.isAdded) {
                return 1
            } else if (!a.isAdded && b.isAdded) {
                return -1
            }

            if (a.isExactMatch && !b.isExactMatch) {
                return -1
            } else if (!a.isExactMatch && b.isExactMatch) {
                return 1
            }

            return 0
        })

        this.setState(this.state)
    }

    onAddExactMatch(event, data) {
        event.preventDefault()

        this.addExactMatch(data)
    }

    addExactMatch(playerData) {
        let eventData = Common.getEventData()
        if (eventData.setupData.players.find((data) => data.id === playerData.id)) {
            return
        }

        playerData.isAdded = true
        eventData.setupData.players.push({
            id: playerData.id
        })

        eventData.setupData.players = eventData.setupData.players.slice().sort((a, b) => {
            let aFullName = a.firstName + " " + a.lastName
            let bFullName = b.firstName + " " + b.lastName
            return aFullName.localeCompare(bFullName)
        })

        Common.onEventDataChanged()

        this.setState(this.state)
    }

    onAddAllExactMatches(event) {
        event.preventDefault()

        for (let data of this.state.inputPlayerMatches) {
            if (data.isExactMatch) {
                this.addExactMatch(data)
            }
        }
    }

    getPlayerMatches() {
        return this.state.inputPlayerMatches.map((data, i) => {
            return (
                <div className="matchContainer" key={i}>
                    <div className="name">
                        {data.fullName}{data.isAdded ? " - Already Added" : null}
                    </div>
                    <button className={data.isExactMatch && !data.isAdded ? "" : "none"} onClick={(e) => this.onAddExactMatch(e, data)}>Add Exact Match</button>
                    <button className={!data.isExactMatch && !data.isAdded ? "" : "none"}>Add New Player</button>
                </div>
            )
        })
    }

    render() {
        if (MainStore.isPlayerMainWidgetEnabled !== true) {
            return null
        }

        return (
            <div className="playerMainWidget">
                Add Players
                <form>
                    <label>
                        One Name Per Line
                        <textarea value={this.state.inputText} onChange={(e) => this.onInputTextChanged(e)} rows={5} />
                    </label>
                    <div>
                        <button onClick={(e) => this.onAddAllExactMatches(e)}>Add All Exact Matches</button>
                    </div>
                    {this.getPlayerMatches()}
                </form>
            </div>
        )
    }
}
