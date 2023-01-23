/* eslint-disable no-loop-func */
"use strict"

const React = require("react")
const MobxReact = require("mobx-react")
const Fuzzysort = require("fuzzysort")

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
                    value: "Ryan Young\nEmma Kahle\nJames"
                }
            })
        }, 1000)
    }

    onInputTextChanged(e) {
        this.state.inputText = e.target.value

        this.state.inputPlayerMatches = []

        let lines = this.state.inputText.split("\n")
        for (let line of lines) {
            line = line.trim()
            if (line.length > 0) {
                let playerData = Common.findPlayerByFullName(line)
                if (playerData !== undefined) {
                    this.state.inputPlayerMatches.push({
                        key: playerData.key,
                        fullName: playerData.firstName + " " + playerData.lastName,
                        isExactMatch: true,
                        isAdded: this.isPlayerAdded(playerData.key)
                    })
                } else {
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

    onEventPlayersChanged() {
        Common.updateCachedRegisteredFullNames()
        Common.onEventDataChanged()

        this.setState(this.state)
    }

    addExactMatch(matchData) {
        if (this.isPlayerAdded(matchData.key)) {
            return
        }

        matchData.isAdded = true
        MainStore.eventData.eventData.playerData[matchData.key] = {
            key: matchData.key,
            name: matchData.fullName
        }

        this.onEventPlayersChanged()
    }

    onAddAllExactMatches(event) {
        event.preventDefault()

        for (let data of this.state.inputPlayerMatches) {
            if (data.isExactMatch) {
                this.addExactMatch(data)
            }
        }
    }

    onFindPlayer(event, data) {
        event.preventDefault()

        data.isFinding = true

        this.setState(this.state)
    }

    onAddFindMatch(event, matchData, playerData) {
        event.preventDefault()

        matchData.isFinding = false
        matchData.isAdded = true
        matchData.key = playerData.key

        MainStore.eventData.eventData.playerData[playerData.key] = {
            key: playerData.key,
            name: playerData.fullName
        }

        this.onEventPlayersChanged()
    }

    isPlayerAdded(playerKey) {
        if (MainStore.eventData === undefined) {
            return false
        }

        return MainStore.eventData.eventData.playerData[playerKey] !== undefined
    }

    onAddNewPlayer(firstName, lastName, matchData) {
        Common.fetchEx("ADD_PLAYER", {
            firstName: firstName,
            lastName: lastName
        }, {}, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        }).then((data) => {
            MainStore.playerData[data.addedPlayer.key] = data.addedPlayer

            matchData.isAdded = true
            matchData.key = data.addedPlayer.key
            this.addExactMatch(matchData)
        }).catch((error) => {
            console.error(`Failed to Add New Player: ${error}`)
        })
    }

    getPlayerMatches() {
        return this.state.inputPlayerMatches.map((data, i) => {
            if (data.isFinding === true) {
                let fuzzyResults = Fuzzysort.go(data.fullName, MainStore.cachedFullNames)
                let candidatePlayerData = fuzzyResults.map((fuzzyData) => {
                    return Common.findPlayerByFullName(fuzzyData.target)
                })
                let candidates = candidatePlayerData.map((playerData, playerIndex) => {
                    if (this.isPlayerAdded(playerData.key)) {
                        return (
                            <div key={playerIndex} className="candidate">
                                <div>
                                    {playerData.firstName + " " + playerData.lastName + " - Already Added"}
                                </div>
                            </div>
                        )
                    } else {
                        return (
                            <div key={playerIndex} className="candidate">
                                <div>
                                    {playerData.firstName + " " + playerData.lastName}
                                </div>
                                <button onClick={(e) => this.onAddFindMatch(e, data, playerData)}>Add Player</button>
                            </div>
                        )
                    }
                })

                candidates.splice(0, 0, <NewPlayerWidget key="newPlayer" matchData={data} onAddNewPlayer={(f, l, m) => this.onAddNewPlayer(f, l, m)} />)

                return (
                    <div className="matchContainer finding" key={i}>
                        <div className="name">
                            {data.fullName}{" - Finding"}
                        </div>
                        {candidates}
                    </div>
                )
            } else {
                return (
                    <div className="matchContainer" key={i}>
                        <div className="name">
                            {data.fullName}{data.isAdded ? " - Already Added" : null}
                        </div>
                        <button className={data.isExactMatch && !data.isAdded ? "" : "none"} onClick={(e) => this.onAddExactMatch(e, data)}>Add Exact Match</button>
                        <button className={!data.isExactMatch && !data.isAdded ? "" : "none"} onClick={(e) => this.onFindPlayer(e, data)}>Find Player</button>
                    </div>
                )
            }
        })
    }

    render() {
        if (MainStore.isPlayerMainWidgetEnabled !== true) {
            return null
        }

        return (
            <div className="playerMainWidget">
                <h3>
                    Add Players
                </h3>
                <label>
                    One Name Per Line
                    <textarea value={this.state.inputText} onChange={(e) => this.onInputTextChanged(e)} rows={5} />
                </label>
                <div>
                    <button onClick={(e) => this.onAddAllExactMatches(e)}>Add All Exact Matches</button>
                </div>
                {this.getPlayerMatches()}
            </div>
        )
    }
}

@MobxReact.observer class NewPlayerWidget extends React.Component {
    constructor() {
        super()

        this.state = {
            isEnteringNewPlayer: false,
            firstName: "",
            lastName: ""
        }
    }

    componentDidMount() {
        let nameParts = this.props.matchData.fullName.trim().split(" ")
        if (nameParts.length > 0) {
            this.state.firstName = nameParts[0]

            if (nameParts.length > 1) {
                this.state.lastName = nameParts.slice(1).join(" ")
            }

            this.setState(this.state)
        }
    }

    onNewPlayer(e) {
        e.preventDefault()

        this.state.isEnteringNewPlayer = true
        this.setState(this.state)
    }

    onNewPlayerFirstNameChanged(e) {
        this.state.firstName = e.target.value
        this.setState(this.state)
    }

    onNewPlayerLastNameChanged(e) {
        this.state.lastName = e.target.value
        this.setState(this.state)
    }

    onAddNewPlayer(e) {
        e.preventDefault()

        this.state.isEnteringNewPlayer = false
        this.setState(this.state)

        this.props.onAddNewPlayer(this.state.firstName, this.state.lastName, this.props.matchData)
    }

    render() {
        if (!this.state.isEnteringNewPlayer) {
            return <button onClick={(e) => this.onNewPlayer(e)}>Add New Player</button>
        } else {
            return (
                <div>
                    <label>
                        First Name:
                        <input type="text" value={this.state.firstName} onChange={(e) => this.onNewPlayerFirstNameChanged(e)} />
                    </label>
                    <label>
                        Last Name:
                        <input type="text" value={this.state.lastName} onChange={(e) => this.onNewPlayerLastNameChanged(e)} />
                    </label>
                    <button onClick={(e) => this.onAddNewPlayer(e)}>Add New Player</button>
                </div>
            )
        }
    }
}
