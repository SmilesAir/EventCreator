/* eslint-disable no-alert */
/* eslint-disable no-loop-func */
"use strict"

const React = require("react")
const MobxReact = require("mobx-react")
const ReactSelect = require("react-select").default
const { Tab, Tabs, TabList, TabPanel } = require("react-tabs")
const { runInAction } = require("mobx")
const { v4: uuidv4 } = require("uuid")

const MainStore = require("mainStore.js")
const Common = require("common.js")

require("quickSetupWidget.less")
require("react-tabs/style/react-tabs.css")

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition
const recognition = new SpeechRecognition()

module.exports = MobxReact.observer(class QuickSetupWidget extends React.Component {
    constructor() {
        super()

        this.voiceButtonTextReady = "Voice Input (Coming Soon)"

        this.state = {
            roundTabIndex: 0,
            teamsArray: [],
            roundsArray: [ [ [] ], [] ],
            editTeamIndex: undefined,
            editPlayerIndex: undefined,
            playerPickerText: "",
            voiceButtonText: this.voiceButtonTextReady,
            searchNames: [],
            isLoading: true,
            recentEventValue: undefined,
            eventKey: undefined,
            eventName: ""
        }

        Common.downloadPlayerAndEventSummaryData().then(() => {
            this.setState({ isLoading: false })

            let selectedKey = localStorage.getItem("quickSelectedEventKey")
            if (selectedKey) {
                this.setState({
                    recentEventValue: {
                        label: MainStore.eventSummaryData[selectedKey].eventName,
                        value: selectedKey
                    }
                })
                this.fetchEventData(selectedKey)
            }
        })
    }

    fetchEventData(eventKey) {
        this.setState({
            eventKey: eventKey,
            isLoading: true,
            eventName: MainStore.eventSummaryData[eventKey].eventName,
            teamsArray: [],
            roundsArray: [ [ [] ], [] ]
        })

        return Common.fetchEx("GET_EVENT_DATA", { eventKey: eventKey }, {}, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        }).then((data) => {
            console.log("GET_EVENT_DATA", data)
            MainStore.eventData = data.eventData

            this.divisionName = "Open Pairs"
            let divisionData = MainStore.eventData.eventData.divisionData[this.divisionName]
            this.state.teamsArray = divisionData.teams.slice()

            for (let roundIndex = 0; roundIndex < 2; ++roundIndex) {
                for (let poolIndex = 0; poolIndex < 2; ++poolIndex) {
                    let roundData = MainStore.eventData.eventData.poolMap[Common.makePoolKey(eventKey, this.divisionName, roundIndex === 0 ? "Finals" : "Semifinals", Common.getPoolLetter(poolIndex))]
                    if (roundData !== undefined) {
                        this.state.roundsArray[roundIndex][poolIndex] = roundData.teamData.map((teamData) => {
                            return teamData.players.slice()
                        })
                    }
                }
            }

            this.state.isLoading = false

            this.setState(this.state)

        }).catch((error) => {
            console.error(`Failed to download Event Data: ${error}`)

            this.setState({ isLoading: false })
        })
    }

    onRoundTabIndexChange(index) {
        runInAction(() => {
            this.setState({ roundTabIndex: index })
        })
    }

    getPlayerInputContent(data, index) {
        if (data === undefined) {
            return <div>Add Player</div>
        }

        let playerKey = data[index]
        if (playerKey === undefined) {
            return <div>Add Player</div>
        }

        let playerData = MainStore.playerData[playerKey]
        if (MainStore.playerData === undefined || playerData === undefined) {
            return <div>Unkonwn</div>
        }

        return (
            <div>
                <div>{playerData.firstName}</div>
                <div>{playerData.lastName}</div>
            </div>
        )
    }

    removeTeam(index) {
        this.state.teamsArray.splice(index, 1)
        this.setState(this.state)
    }

    editTeamPlayer(teamIndex, playerIndex) {
        runInAction(() => {
            this.state.editTeamIndex = teamIndex
            this.state.editPlayerIndex = playerIndex
            this.state.playerPickerText = ""
            this.state.searchNames = []

            this.setState(this.state)
        })
    }

    getTeamInputWidget(data, index) {
        return (
            <div key={index} className="teamInput">
                <div>{index + 1}.</div>
                <button disabled={index >= this.state.teamsArray.length} onClick={() => this.removeTeam(index)}>X</button>
                <button className="playerInput" onClick={() => this.editTeamPlayer(index, 0)}>{this.getPlayerInputContent(data, 0)}</button>
                <button className="playerInput" onClick={() => this.editTeamPlayer(index, 1)}>{this.getPlayerInputContent(data, 1)}</button>
                <button className="playerInput" onClick={() => this.editTeamPlayer(index, 2)}>{this.getPlayerInputContent(data, 2)}</button>
            </div>
        )
    }

    closePlayerPicker() {
        this.setState({
            editTeamIndex: undefined,
            editPlayerIndex: undefined,
            playerPickerText: "",
            searchNames: []
        })
    }

    clearPickedPlayer() {
        let team = this.state.teamsArray[this.state.editTeamIndex]
        team[this.state.editPlayerIndex] = undefined

        this.closePlayerPicker()
    }

    onPlayerPickerTextChange(e) {
        let candidatePlayerData = Common.getSimilarPlayerDataByName(e.target.value, MainStore.cachedFullNames)
        let searchNames = candidatePlayerData.map((playerData) => {
            return {
                key: playerData.key,
                name: playerData.firstName + " " + playerData.lastName,
            }
        })

        this.setState({
            playerPickerText: e.target.value,
            searchNames: searchNames
        })
    }

    onStartVoice() {
        navigator.mediaDevices.getUserMedia({ video: false, audio: true })

        recognition.continuous = false
        recognition.interimResults = false
        recognition.maxAlternatives = 1
        this.setState({ voiceButtonText: "Recording..." })

        recognition.onresult = (event) => {
            const name = event.results[0][0].transcript
            console.log(name, `Confidence: ${event.results[0][0].confidence}`)

            let candidatePlayerData = Common.getSimilarPlayerDataByName(name, MainStore.cachedFullNames)
            let searchNames = candidatePlayerData.map((playerData) => {
                return {
                    key: playerData.key,
                    name: playerData.firstName + " " + playerData.lastName,
                }
            })

            this.setState({
                playerPickerText: name,
                searchNames: searchNames
            })
        }

        recognition.onspeechstart = () => {
            this.setState({ voiceButtonText: "Recording>.." })
            setTimeout(() => {
                this.setState({ voiceButtonText: "Recording>>." })
                setTimeout(() => {
                    this.setState({ voiceButtonText: "Recording>>>" })
                    setTimeout(() => {
                        this.setState({ voiceButtonText: "Recording.>>" })
                        setTimeout(() => {
                            this.setState({ voiceButtonText: "Recording..>" })
                            setTimeout(() => {
                                this.setState({ voiceButtonText: "Recording..." })
                            }, 100)
                        }, 100)
                    }, 100)
                }, 100)
            }, 100)
        }

        recognition.onend = () => {
            this.setState({ voiceButtonText: this.voiceButtonTextReady })
        }

        recognition.start()
    }

    pickPlayer(playerKey) {
        let teams = this.state.teamsArray
        while (teams.length <= this.state.editTeamIndex) {
            teams.push([])
        }
        teams[this.state.editTeamIndex][this.state.editPlayerIndex] = playerKey
        this.closePlayerPicker()
    }

    getSearchNamesResultsWidget() {
        if (this.state.searchNames.length === 0) {
            return null
        }

        let widgets = this.state.searchNames.map((data, index) => {
            return <button key={index} onClick={() => this.pickPlayer(data.key)}>{data.name}</button>
        })

        return (
            <div className="searchResults">
                {widgets}
            </div>
        )
    }

    getPlayerPickerWidget() {
        if (this.state.editPlayerIndex === undefined || this.state.editTeamIndex === undefined) {
            return null
        }

        let team = this.state.teamsArray[this.state.editTeamIndex]
        let playerName = null
        if (team && team[this.state.editPlayerIndex]) {
            playerName = "Selected: " + Common.getPlayerNameString(team[this.state.editPlayerIndex])
        }

        return (
            <div className="playerPicker">
                <button onClick={() => this.closePlayerPicker()}>Close</button>
                {playerName}
                {playerName ? <button onClick={() => this.clearPickedPlayer()}>Clear Player</button> : null}
                <button disabled={true} onClick={() => this.onStartVoice()}>{this.state.voiceButtonText}</button>
                <label>
                    Search
                    <input type="text" value={this.state.playerPickerText} onChange={(e) => this.onPlayerPickerTextChange(e)}/>
                </label>
                {this.getSearchNamesResultsWidget()}
            </div>
        )
    }

    getTeamsWidget() {
        let widgets = this.state.teamsArray.map((data, index) => {
            return this.getTeamInputWidget(data, index)
        })

        widgets.push(
            this.getTeamInputWidget(undefined, this.state.teamsArray.length)
        )

        return (
            <div className="teamsWidget">
                {this.getPlayerPickerWidget()}
                <div>
                    Enter teams below. Players can be left blank.
                </div>
                {widgets}
            </div>
        )
    }

    removeTeamFromPool(roundIndex, poolIndex, teamIndex) {
        let roundData = this.state.roundsArray[roundIndex]
        if (roundData === undefined || roundIndex >= this.state.roundsArray.length || poolIndex >= roundData.length) {
            return
        }
        let poolData = this.state.roundsArray[roundIndex][poolIndex]
        poolData.splice(teamIndex, 1)

        this.setState(this.state)
    }

    moveTeam(roundIndex, poolIndex, teamIndex, direction) {
        let roundData = this.state.roundsArray[roundIndex]
        if (roundData === undefined || roundIndex >= this.state.roundsArray.length || poolIndex >= roundData.length) {
            return
        }

        let poolData = this.state.roundsArray[roundIndex][poolIndex]
        if (teamIndex < 0 || teamIndex >= poolData.length) {
            return
        }

        if (direction > 0) {
            if (teamIndex + 1 >= poolData.length) {
                return
            }
            [ poolData[teamIndex], poolData[teamIndex + 1] ] = [ poolData[teamIndex + 1], poolData[teamIndex] ]
        } else if (direction < 0) {
            if (teamIndex - 1 < 0) {
                return
            }
            [ poolData[teamIndex], poolData[teamIndex - 1] ] = [ poolData[teamIndex - 1], poolData[teamIndex] ]
        } else {
            if (roundData.length < 2) {
                return
            }

            let otherPoolIndex = (poolIndex + 1) % 2
            let removed = poolData.splice(teamIndex, 1)
            roundData[otherPoolIndex].splice(Math.min(roundData[otherPoolIndex].length, teamIndex), 0, removed[0])
        }

        this.setState(this.state)
    }

    seedTeams(roundData, type, isDataUpdated) {
        for (let i = 0; i < roundData.length; ++i) {
            roundData[i] = []
        }

        if (type === 2) {
            // Hacky way to ensure results are up to date before sorting teams
            if (isDataUpdated !== true) {
                Common.downloadPlayerAndEventSummaryData().then(() => {
                    this.seedTeams(roundData, type, true)
                })
                return
            }

            let divisionData = MainStore.eventData.eventData.divisionData[this.divisionName]
            let previousRoundName = "Semifinals"
            let sortedTeamsFromResults = divisionData.roundData[previousRoundName].poolNames.map((poolName) => {
                let poolKey = Common.makePoolKey(MainStore.eventData.key, this.divisionName, previousRoundName, poolName)
                let poolData = MainStore.eventData.eventData.poolMap[poolKey]
                let sortedPoolTeams = poolData.teamData.slice()
                sortedPoolTeams.sort((a, b) => {
                    if (a.teamScore === undefined && b.teamScore === undefined) {
                        return 0
                    } else if (a.teamScore === undefined) {
                        return 1
                    } else if (b.teamScore === undefined) {
                        return -1
                    } else {
                        return a.teamScore - b.teamScore
                    }
                })

                return sortedPoolTeams.map((teamData) => {
                    return teamData.players
                })
            })

            let smallestPoolTeamCount = Number.MAX_SAFE_INTEGER
            for (let teams of sortedTeamsFromResults) {
                smallestPoolTeamCount = Math.min(smallestPoolTeamCount, teams.length)
            }

            for (let i = 0; i < smallestPoolTeamCount; ++i) {
                let placeTeams = []
                for (let teams of sortedTeamsFromResults) {
                    placeTeams.push(teams[i])
                }

                placeTeams.sort((a, b) => {
                    return Common.getTeamRankingPointsByDivision(b, this.divisionName) - Common.getTeamRankingPointsByDivision(a, this.divisionName)
                })

                for (let team of placeTeams) {
                    roundData[0].splice(0, 0, team)
                }
            }
        } else {
            let sortedTeams = []
            if (type === 0) {
                sortedTeams = this.state.teamsArray.map((data) => {
                    return {
                        players: data,
                        points: Common.getTeamRankingPointsByDivision(data, this.divisionName)
                    }
                }).sort((a, b) => b.points - a.points).map((data) => data.players)

                if (roundData.length === 1) {
                    sortedTeams.reverse()
                }
            } else if (type === 1) {
                sortedTeams = this.state.teamsArray.slice()

                if (roundData.length === 2) {
                    sortedTeams.reverse()
                }
            }

            if (roundData.length === 1) {
                roundData[0] = sortedTeams
            } else if (roundData.length === 2) {
                let teamIndex = 0
                let dir = 1
                while(teamIndex < sortedTeams.length) {
                    for (let i = 0; i < 2 && teamIndex < sortedTeams.length; ++i) {
                        let poolIndex = dir > 0 ? i : 2 - i - 1
                        let team = sortedTeams[teamIndex]
                        roundData[poolIndex].push(team)
                        console.log(poolIndex, Common.getPlayerNamesString(team))
                        ++teamIndex
                    }

                    dir *= -1
                }

                roundData[0].reverse()
                roundData[1].reverse()
            }
        }

        this.setState(this.state)
    }

    addPool(roundIndex) {
        this.state.roundsArray[roundIndex].push([])
        this.setState(this.state)
    }

    getRoundsWidget(roundIndex) {
        let roundData = this.state.roundsArray[roundIndex]
        let pools = []

        pools = roundData.map((data, index) => {
            let teams = data.map((teamData, teamIndex) => {
                return (
                    <div key={teamIndex} className="pool">
                        <div className="team">
                            <div>{teamIndex + 1}.</div>
                            <button disabled={teamIndex === 0} onClick={() => this.moveTeam(roundIndex, index, teamIndex, -1)}>↑</button>
                            <button disabled={teamIndex + 1 >= data.length} onClick={() => this.moveTeam(roundIndex, index, teamIndex, 1)}>↓</button>
                            {roundData.length > 1 ? <button onClick={() => this.moveTeam(roundIndex, index, teamIndex, 0)}>⇅</button> : null}
                            <button onClick={() => this.removeTeamFromPool(roundIndex, index, teamIndex)}>X</button>
                            <div>{Common.getPlayerNamesString(teamData)}</div>
                        </div>
                    </div>
                )
            })

            return (
                <div key={index}>
                    <div>Pool {Common.getPoolLetter(index)}</div>
                    {teams}
                </div>
            )
        })

        let addButton = null
        if (roundIndex === 1 && roundData.length < 2) {
            addButton = <button onClick={() => this.addPool(roundIndex)}>Add Pool</button>
        }

        return (
            <div className="roundsWidget">
                <button onClick={() => this.seedTeams(roundData, 0)}>Seed By Rank</button>
                <button onClick={() => this.seedTeams(roundData, 1)}>Seed By Team Order</button>
                { roundIndex === 0 ? <button onClick={() => this.seedTeams(roundData, 2)}>Seed By Semifinals Results</button> : null }
                {pools}
                {addButton}
            </div>
        )
    }

    getLoadingWidget() {
        if (!this.state.isLoading) {
            return null
        }

        return (
            <div className="loading">
                Loading...
            </div>
        )
    }

    getRecentEventOptions() {
        if (MainStore.eventSummaryData === undefined) {
            return []
        }

        let sortedEvents = []
        let recentDate = new Date()
        recentDate.setDate(recentDate.getDate() - 7 * 4)
        for (let eventSummary of Object.values(MainStore.eventSummaryData)) {
            if (new Date(eventSummary.startDate) > recentDate) {
                sortedEvents.push(eventSummary)
            }
        }

        sortedEvents.sort((a, b) => new Date(b.startDate) - new Date(a.startDate))

        return sortedEvents.map((data) => {
            return {
                label: data.eventName,
                value: data.key
            }
        })
    }

    onRecentEventChange(e) {
        this.setState({ recentEventValue: e })

        localStorage.setItem("quickSelectedEventKey", e.value)

        this.fetchEventData(e.value)
    }

    newEvent() {
        localStorage.removeItem("quickSelectedEventKey")

        location.reload()
    }

    fillPoolMapPool(round, pool, teams) {
        let poolMap = MainStore.eventData.eventData.poolMap
        let poolKey = Common.makePoolKey(this.state.eventKey, this.divisionName, round, pool)
        let oldPool = poolMap[poolKey]
        let newPool = undefined
        if (!oldPool) {
            poolMap[poolKey] = {
                isLocked: false,
                judges: {},
                key: poolKey,
                teamData: []
            }

            newPool = poolMap[poolKey]
        } else {
            newPool = oldPool
        }

        newPool.teamData = teams.map((data) => {
            return {
                players: data,
                judgeData: {}
            }
        })
    }

    async saveAndUpload() {
        if (this.state.eventKey === undefined) {
            let newEventKey = uuidv4()
            await Common.uploadEvent(newEventKey, this.state.eventName, new Date(), new Date())
            MainStore.eventData = Common.createNewEventDataJson(newEventKey, this.state.eventName)

            this.state.eventKey = newEventKey
        }

        if (MainStore.eventData === undefined) {
            MainStore.eventData = Common.createNewEventDataJson(this.state.eventKey, this.state.eventName)
        }

        // Create eventData from quick state
        let roundData = {}
        if (this.state.roundsArray[0].length > 0) {
            roundData.Finals = {
                lengthSeconds: 180,
                name: "Finals",
                poolNames: [ "A" ]
            }

            this.fillPoolMapPool("Finals", "A", this.state.roundsArray[0][0])
        }
        let semiPoolCount = this.state.roundsArray[1].length
        if (semiPoolCount > 0) {
            roundData.Semifinals = {
                lengthSeconds: 180,
                name: "Semifinals",
                poolNames: semiPoolCount > 1 ? [ "A", "B" ] : [ "A" ]
            }

            for (let i = 0; i < semiPoolCount; ++i) {
                this.fillPoolMapPool("Semifinals", Common.getPoolLetter(i), this.state.roundsArray[1][i])
            }
        }

        MainStore.eventData.eventData.divisionData[this.divisionName] = {
            name: this.divisionName,
            roundData: roundData,
            rulesId: "SimpleRanking",
            teams: this.state.teamsArray
        }

        for (let team of this.state.teamsArray) {
            for (let playerKey of team) {
                if (playerKey) {
                    MainStore.eventData.eventData.playerData[playerKey] = {
                        key: playerKey,
                        name: Common.getPlayerNameString(playerKey)
                    }
                }
            }
        }

        Common.fetchEx("IMPORT_EVENT_DATA", { eventKey: this.state.eventKey }, undefined, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(MainStore.eventData)
        }).then((response) => {
            console.log(response)
            alert("Upload Succesful")
        }).catch((error) => {
            console.error(`Trying to update event state "${error}"`)
            alert(`Failed to Upload: ${error}`)
        })

        this.setState(this.state)
    }

    onEventNameChange(e) {
        this.setState({ eventName: e.target.value })
    }

    render() {
        return (
            <div className="quickSetupWidget">
                {this.getLoadingWidget()}
                <div className="eventSelection">
                    <label>
                        Recent Events
                        <ReactSelect value={this.state.recentEventValue} options={this.getRecentEventOptions()} onChange={(e) => this.onRecentEventChange(e)}/>
                    </label>
                    <label>
                        Event Name
                        <input type="text" value={this.state.eventName} onChange={(e) => this.onEventNameChange(e)}/>
                    </label>
                </div>
                <div className="buttonControls">
                    <button onClick={() => this.newEvent()}>New Event</button>
                    <button onClick={async() => this.saveAndUpload()}>Save and Upload</button>
                </div>
                <Tabs selectedIndex={this.state.roundTabIndex} onSelect={(index) => this.onRoundTabIndexChange(index)}>
                    <TabList>
                        <Tab>Teams</Tab>
                        <Tab>Final</Tab>
                        <Tab>Semifinal</Tab>
                    </TabList>
                    <TabPanel>
                        {this.getTeamsWidget()}
                    </TabPanel>
                    <TabPanel>
                        {this.getRoundsWidget(0)}
                    </TabPanel>
                    <TabPanel>
                        {this.getRoundsWidget(1)}
                    </TabPanel>
                </Tabs>
            </div>
        )
    }
})
