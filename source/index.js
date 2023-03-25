/* eslint-disable no-alert */
"use strict"

const React = require("react")
const ReactDOM = require("react-dom")
const MobxReact = require("mobx-react")
const ReactSelect = require("react-select").default
const { runInAction } = require("mobx")

const MainStore = require("mainStore.js")
const Common = require("common.js")
const PlayersMainWidget = require("playersMainWidget.js")
const PlayersSideWidget = require("playersSideWidget.js")

require("index.less")

let collapseCallbacks = []
function registerCollapseCallback(callback) {
    collapseCallbacks.push(callback)
}

const EventCreator = MobxReact.observer(class EventCreator extends React.Component {
    constructor() {
        super()

        Common.downloadPlayerAndEventSummaryData().then(() => {
            Common.loadFromLocalStorage()
        })
    }

    saveAndUpload() {
        Common.saveToLocalStorage()
        Common.uploadEventData()
    }

    collapseAll() {
        for (let callback of collapseCallbacks) {
            if (callback !== undefined) {
                // eslint-disable-next-line callback-return
                callback()
            }
        }

        document.getElementById("scrollContainer").scrollTop = 0
    }

    render() {
        return (
            <div className="topContainer">
                <div className="menu">
                    <button onClick={() => Common.createNewEventData(MainStore.selectedEventKey, MainStore.eventData.eventName)}>New</button>
                    <button onClick={() => this.saveAndUpload()}>Save and Upload</button>
                    <button onClick={() => Common.downloadAndMerge()}>Download and Merge</button>
                    <button onClick={() => Common.downloadAndReplace()}>Download and Replace</button>
                    <a href="https://forms.gle/1ArbQ1b6HNMso1iu7" target="_blank" rel="noreferrer">Create New Event</a>
                    <button onClick={() => this.collapseAll()}>Collapse All</button>
                </div>
                <div id="scrollContainer" className="scrollContainer">
                    <EventWidget />
                    <div className="bodyContainer">
                        <PlayersSideWidget />
                        <div className="mainWidget">
                            <PlayersMainWidget />
                            <DivisionListWidget />
                        </div>
                    </div>
                </div>
            </div>
        )
    }
})

const EventWidget = MobxReact.observer(class EventWidget extends React.Component {
    constructor() {
        super()
    }

    onSelectEventChanged(selected) {
        MainStore.selectedEventKey = selected.value

        if (MainStore.eventData !== undefined) {
            MainStore.eventData.eventName = selected.label
        }
    }

    render() {
        if (MainStore.eventSummaryData === undefined) {
            return <h1>No Event Summary Data</h1>
        }

        let selectedEventValue = null
        let eventSummaryData = MainStore.eventSummaryData[MainStore.selectedEventKey]
        if (eventSummaryData !== undefined) {
            selectedEventValue = {
                value: eventSummaryData.key,
                label: eventSummaryData.eventName
            }
        }

        let eventSummaryOptions = []
        for (let eventKey in MainStore.eventSummaryData) {
            let data = MainStore.eventSummaryData[eventKey]
            eventSummaryOptions.push({
                value: eventKey,
                label: data.eventName
            })
        }

        return (
            <div>
                <form>
                    <label>
                        {"Select Event: "}
                        <ReactSelect value={selectedEventValue} options={eventSummaryOptions} onChange={(e) => this.onSelectEventChanged(e)} />
                    </label>
                </form>
            </div>
        )
    }
})

const DivisionListWidget = MobxReact.observer(class DivisionListWidget extends React.Component {
    constructor() {
        super()
    }

    onAddDivision() {
        let divisionName = Common.getMissingDivisionName()
        MainStore.eventData.eventData.divisionData[divisionName] = {
            name: divisionName,
            headJudge: undefined,
            directors: [],
            roundData: {}
        }
    }

    getDivisionWidgets() {
        let eventData = MainStore.eventData
        let divisionData = eventData && eventData.eventData && eventData.eventData.divisionData
        if (divisionData === undefined) {
            return null
        }

        let divisionWidgets = []
        for (let divisionName in divisionData) {
            divisionWidgets.push(
                <DivisionWidget key={divisionName} divisionData={divisionData[divisionName]} />
            )
        }

        return divisionWidgets
    }

    render() {
        return (
            <div className="divisionListWidget">
                <button className="addDivisionButton" disabled={Common.getMissingDivisionName() === undefined} onClick={(e) => this.onAddDivision(e)}>Add Division</button>
                <h3>
                    Divisions
                </h3>
                {this.getDivisionWidgets()}
            </div>
        )
    }
})

const DivisionWidget = MobxReact.observer(class DivisionWidget extends React.Component {
    constructor(props) {
        super(props)

        this.state = {
            isTeamWidgetEnabled: false,
            inputTeamsText: "",
            parsedTeamWidgets: undefined,
            parsedTeamState: [],
            divisionName: this.props.divisionData && this.props.divisionData.name,
            rulesId: this.props.divisionData && this.props.divisionData.rulesId || "Fpa2020"
        }

        registerCollapseCallback(() => {
            this.state.isTeamWidgetEnabled = false
            this.setState(this.state)
        })
    }

    onAddRound() {
        let roundName = Common.getMissingRoundName(this.state.divisionName)
        this.props.divisionData.roundData[roundName] = {
            name: roundName,
            lengthSeconds: 180,
            poolNames: []
        }
    }

    getRoundWidgets() {
        if (this.props.divisionData === undefined) {
            return null
        }

        let roundWidgets = []
        for (let roundName in this.props.divisionData.roundData) {
            let roundData = this.props.divisionData.roundData[roundName]
            roundWidgets.push(<RoundWidget key={roundWidgets.length} roundData={roundData} divisionData={this.props.divisionData} />)
        }

        return roundWidgets
    }

    onTeamsWidgetClicked() {
        this.state.isTeamWidgetEnabled = !this.state.isTeamWidgetEnabled
        this.setState(this.state)
    }

    onInputTeamsTextChanged(e) {
        this.state.inputTeamsText = e.target.value

        this.state.parsedTeamState = []
        let lines = this.state.inputTeamsText.split("\n")
        for (let line of lines) {
            let teamState = []
            this.state.parsedTeamState.push(teamState)
            let names = line.split("_")
            for (let name of names) {
                let candidatePlayerData = Common.getSimilarPlayerDataByName(name.trim(), MainStore.cachedRegisteredFullNames)
                let options = candidatePlayerData.map((playerData) => {
                    return {
                        value: playerData.firstName + " " + playerData.lastName,
                        label: playerData.firstName + " " + playerData.lastName
                    }
                })
                let defaultOption = options[0] || {
                    value: "Unknown",
                    label: "Unkown"
                }
                teamState.push({
                    value : defaultOption,
                    options: options,
                    teamIndex: this.state.parsedTeamState.length - 1,
                    nameIndex: teamState.length
                })
            }
        }

        this.setState(this.state)
    }

    onTeamNameChanged(teamIndex, nameIndex, selected) {
        this.state.parsedTeamState[teamIndex][nameIndex].value = selected
        this.setState(this.state)
    }

    onAddNewTeam(teamState) {
        let players = teamState.map((state) => {
            return Common.findPlayerByFullName(state.value.value).key
        })
        this.props.divisionData.teams = this.props.divisionData.teams || []
        this.props.divisionData.teams.push(players)
        this.setState(this.state)
    }

    getParsedTeamWidgets() {
        let widgets = []
        for (let teamState of this.state.parsedTeamState) {
            let nameWidgets = [
                <button key={Math.random()} onClick={() => this.onAddNewTeam(teamState)}>Add Team</button>
            ]
            for (let nameState of teamState) {
                nameWidgets.push(<ReactSelect key={Math.random()} value={nameState.value} options={nameState.options} onChange={(e) => this.onTeamNameChanged(nameState.teamIndex, nameState.nameIndex, e)} />)
            }

            widgets.push(
                <div key={Math.random()} className="team">
                    {nameWidgets}
                </div>
            )
        }
        return widgets
    }

    onRemoveNewTeam(playerKeys) {
        let index = this.props.divisionData.teams.findIndex((item) => item === playerKeys)
        if (index >= 0) {
            this.props.divisionData.teams.splice(index, 1)
            this.setState(this.state)
        }
    }

    getAllTeamsListWidget() {
        if (this.props.divisionData.teams === undefined) {
            return null
        }

        return this.props.divisionData.teams.map((playerKeys, index) => {
            return (
                <div key={Math.random()}>
                    {`${index + 1}. `}
                    <button onClick={() => this.onRemoveNewTeam(playerKeys)}>X</button>
                    {` ${Common.getTeamRankingPointsByDivision(playerKeys, this.props.divisionData.name)} ${Common.getPlayerNamesString(playerKeys)}`}
                </div>
            )
        })
    }

    getTeamsWidget() {
        if (this.state.isTeamWidgetEnabled !== true) {
            return (
                <div className="teamsWidget">
                    <div className="editTeams" onClick={() => this.onTeamsWidgetClicked()}>
                        Edit Teams
                    </div>
                </div>
            )
        } else {
            return (
                <div className="teamsWidget enabled">
                    <div className="editTeams" onClick={() => this.onTeamsWidgetClicked()}>
                        Edit Teams
                    </div>
                    <div className="top">
                        <div>
                            <div>
                                One Team Per Line. Used _ to seperate players. Example: Ryan Young _ James Wiseman
                                <textarea value={this.state.inputTeamsText} onChange={(e) => this.onInputTeamsTextChanged(e)} rows={5} />
                            </div>
                            <div>
                                {this.getParsedTeamWidgets()}
                            </div>
                        </div>
                        <div className="allTeamsWidget">
                            <h3>
                                All Teams
                            </h3>
                            <div className="allTeams">
                                {this.getAllTeamsListWidget()}
                            </div>
                        </div>
                    </div>
                </div>
            )
        }
    }

    onDivisionNameChanged(e) {
        if (this.state.divisionName !== e.target.value) {
            runInAction(() => {
                let newDivisionData = Object.assign({}, MainStore.eventData.eventData.divisionData)
                newDivisionData[e.target.value] = Object.assign({}, newDivisionData[this.state.divisionName])
                newDivisionData[e.target.value].name = e.target.value
                delete newDivisionData[this.state.divisionName]
                MainStore.eventData.eventData.divisionData = newDivisionData
            })
        }
    }

    getDivisionNameWidget() {
        let options = []
        for (let divisionName of Common.divisionNames) {
            if (divisionName === this.state.divisionName || MainStore.eventData.eventData.divisionData[divisionName] === undefined) {
                options.push(
                    <option key={divisionName} value={divisionName}>{divisionName}</option>
                )
            }
        }

        return (
            <select value={this.state.divisionName} disabled={Common.divisionHasPools(this.state.divisionName)} onChange={(e) => this.onDivisionNameChanged(e)}>
                <optgroup>
                    {options}
                </optgroup>
            </select>
        )
    }

    onDeleteDivision() {
        delete MainStore.eventData.eventData.divisionData[this.state.divisionName]
    }

    onDivisionRulesChanged(e) {
        if (this.state.rulesId !== e.target.value) {
            runInAction(() => {
                MainStore.eventData.eventData.divisionData[this.state.divisionName].rulesId = e.target.value
                this.state.rulesId = e.target.value
                this.setState(this.state)
            })
        }
    }

    getDivisionRulesWidget() {
        return (
            <select value={this.state.rulesId} onChange={(e) => this.onDivisionRulesChanged(e)}>
                <optgroup>
                    <option key="Fpa2020" value="Fpa2020">FPA 2020</option>
                    <option key="SimpleRanking" value="SimpleRanking">Simple Ranking</option>
                </optgroup>
            </select>
        )
    }

    render() {
        return (
            <div className="divisionWidget">
                {this.getDivisionNameWidget()}
                {this.getDivisionRulesWidget()}
                <button onClick={() => this.onDeleteDivision()}>Delete Division</button>
                <div className="roundsContainer">
                    <button className="addRoundButton" disabled={Common.getMissingRoundName(this.state.divisionName) === undefined} onClick={(e) => this.onAddRound(e)}>Add Round</button>
                    {this.getTeamsWidget()}
                    Rounds
                    {this.getRoundWidgets()}
                </div>
            </div>
        )
    }
})

const RoundWidget = MobxReact.observer(class RoundWidget extends React.Component {
    constructor(props) {
        super(props)

        this.state = {
            roundName: this.props.roundData && this.props.roundData.name,
            routineLength: this.props.roundData.lengthSeconds,
            isRoundWidgetEnabled: false
        }

        registerCollapseCallback(() => {
            this.state.isRoundWidgetEnabled = false
            this.setState(this.state)
        })
    }

    onAddPool() {
        this.props.roundData.poolNames.push(String.fromCharCode("A".charCodeAt(0) + this.props.roundData.poolNames.length))
    }

    getPoolWidgets() {
        return this.props.roundData.poolNames.map((name, i) => {
            let poolKey = Common.makePoolKey(MainStore.eventData.key, this.props.divisionData.name, this.props.roundData.name, name)
            return <PoolWidget key={i} divisionName={this.props.divisionData.name} roundData={this.props.roundData} poolName={name} poolKey={poolKey} />
        })
    }

    onRoundNameChanged(e) {
        if (this.state.roundName !== e.target.value) {
            runInAction(() => {
                let newDivisionData = Object.assign({}, this.props.divisionData)
                newDivisionData.roundData[e.target.value] = Object.assign({}, newDivisionData.roundData[this.state.roundName])
                newDivisionData.roundData[e.target.value].name = e.target.value
                delete newDivisionData.roundData[this.state.roundName]
                MainStore.eventData.eventData.divisionData[this.props.divisionData.name] = newDivisionData

                this.state.roundName = e.target.value
                this.setState(this.state)
            })
        }
    }

    getRoundNameWidget() {
        if (this.props.divisionData === undefined) {
            return null
        }

        let options = []
        for (let roundName of Common.roundNames) {
            if (roundName === this.state.roundName || this.props.divisionData.roundData[roundName] === undefined) {
                options.push(
                    <option key={roundName} value={roundName}>{roundName}</option>
                )
            }
        }

        return (
            <select value={this.state.roundName} disabled={Common.roundHasPools(this.props.divisionData.name, this.state.roundName)} onChange={(e) => this.onRoundNameChanged(e)}>
                <optgroup>
                    {options}
                </optgroup>
            </select>
        )
    }

    onRoutineLengthChanged(e) {
        this.state.routineLength = e.target.value
        this.setState(this.state)

        this.props.roundData.lengthSeconds = parseInt(e.target.value, 10)
    }

    getRoutineLengthWidget() {
        let options = [
            <option key={2} value={120}>2:00</option>,
            <option key={3} value={180}>3:00</option>,
            <option key={4} value={240}>4:00</option>,
            <option key={5} value={300}>5:00</option>
        ]
        return (
            <select value={this.state.routineLength} onChange={(e) => this.onRoutineLengthChanged(e)}>
                {options}
            </select>
        )
    }

    onDeleteRound() {
        if (confirm(`Really delete Round ${this.props.roundData.name}?`)) {
            delete this.props.divisionData.roundData[this.props.roundData.name]
        }
    }

    seedRoundFromRankings() {
        let roundData = this.props.roundData
        let sortedTeams = this.props.divisionData.teams.slice().sort((a, b) => {
            return Common.getTeamRankingPointsByDivision(a, this.props.divisionData.name) - Common.getTeamRankingPointsByDivision(b, this.props.divisionData.name)
        })
        if (this.props.roundData.name === Common.roundNames[0]) {
            if (roundData.poolNames.length !== 1) {
                alert("Trying to seed Finals round, but there are ${roundData.poolNames.length} pools instead of 1")
                return
            }
            let poolKey = Common.makePoolKey(MainStore.eventData.key, this.props.divisionData.name, roundData.name, roundData.poolNames[0])
            let poolData = MainStore.eventData.eventData.poolMap[poolKey]
            poolData.teamData = sortedTeams.map((players) => {
                return {
                    players: players,
                    judgeData: {}
                }
            })
        } else {
            if (roundData.poolNames.length < 1) {
                alert("Need at least 1 pool to see Semifinals")
                return
            }
            let poolDatas = roundData.poolNames.map((poolName) => {
                let poolKey = Common.makePoolKey(MainStore.eventData.key, this.props.divisionData.name, roundData.name, poolName)
                return MainStore.eventData.eventData.poolMap[poolKey]
            })
            for (let poolData of poolDatas) {
                poolData.teamData = []
            }
            let teamIndex = sortedTeams.length - 1
            let dir = 1
            while (teamIndex >= 0) {
                for (let i = 0; i < poolDatas.length && teamIndex >= 0; ++i) {
                    let poolIndex = dir > 0 ? i : poolDatas.length - 1 - i
                    let players = sortedTeams[teamIndex]
                    let poolData = poolDatas[poolIndex]
                    poolData.teamData.splice(0, 0, {
                        players: players,
                        judgeData: {}
                    })
                    --teamIndex
                }

                dir *= -1
            }
        }
    }

    seedRoundFromPreviousRound() {
        // Only works for finals for now
        let roundData = this.props.roundData
        if (roundData.name !== "Finals") {
            return
        }

        let previousRoundName = Common.getPreviousRoundName(roundData.name)
        if (previousRoundName === undefined) {
            return
        }

        let divisionName = this.props.divisionData.name
        let divisionData = MainStore.eventData.eventData.divisionData[divisionName]
        let maxTeamCount = divisionData.roundData[previousRoundName].poolNames.length === 3 ? 9 : 8

        let sortedTeamsFromResults = divisionData.roundData[previousRoundName].poolNames.map((poolName) => {
            let poolKey = Common.makePoolKey(MainStore.eventData.key, divisionName, previousRoundName, poolName)
            let poolData = MainStore.eventData.eventData.poolMap[poolKey]
            let sortedTeams = poolData.teamData.slice()
            sortedTeams.sort((a, b) => {
                if (a.teamScore === undefined && b.teamScore === undefined) {
                    return 0
                } else if (a.teamScore === undefined) {
                    return 1
                } else if (b.teamScore === undefined) {
                    return -1
                } else {
                    return b.teamScore - a.teamScore
                }
            })

            console.log(sortedTeams.map((team) => Common.getPlayerNamesString(team.players)))

            return sortedTeams.map((teamData) => {
                return teamData.players
            })
        })

        let smallestPoolTeamCount = Number.MAX_SAFE_INTEGER
        for (let teams of sortedTeamsFromResults) {
            smallestPoolTeamCount = Math.min(smallestPoolTeamCount, teams.length)
        }

        let finalsPoolKey = Common.makePoolKey(MainStore.eventData.key, divisionName, "Finals", "A")
        let finalsPoolData = MainStore.eventData.eventData.poolMap[finalsPoolKey]
        finalsPoolData.teamData = []
        for (let i = 0; i < smallestPoolTeamCount; ++i) {
            let placeTeams = []
            for (let teams of sortedTeamsFromResults) {
                placeTeams.push(teams[i])
            }

            placeTeams.sort((a, b) => {
                return Common.getTeamRankingPointsByDivision(b, divisionName) - Common.getTeamRankingPointsByDivision(a, divisionName)
            })

            for (let team of placeTeams) {
                finalsPoolData.teamData.splice(0, 0, {
                    players: team,
                    judgeData: {}
                })

                if (finalsPoolData.teamData.length >= maxTeamCount) {
                    return
                }
            }
        }
    }

    onRoundWidgetClicked() {
        this.state.isRoundWidgetEnabled = !this.state.isRoundWidgetEnabled
        this.setState(this.state)
    }

    render() {
        if (this.state.isRoundWidgetEnabled) {
            return (
                <div className="roundWidget">
                    {this.getRoundNameWidget()}
                    {this.getRoutineLengthWidget()}
                    <button onClick={() => this.seedRoundFromRankings()}>Seed Round from Rankings</button>
                    <button onClick={() => this.seedRoundFromPreviousRound()}>Seed Round from Previous Round</button>
                    <button onClick={() => this.onDeleteRound()}>Delete Round</button>
                    <div className="roundsContainer">
                        <button className="addPoolButton" onClick={(e) => this.onAddPool(e)}>Add Pool</button>
                        Pools
                        {this.getPoolWidgets()}
                    </div>
                </div>
            )
        } else {
            return (
                <div className="roundWidgetCollapsed" onClick={() => this.onRoundWidgetClicked()}>
                    {this.props.roundData.name}
                </div>
            )
        }
    }
})

const PoolWidget = MobxReact.observer(class PoolWidget extends React.Component {
    constructor(props) {
        super(props)

        MainStore.eventData.eventData.poolMap[this.props.poolKey] = MainStore.eventData.eventData.poolMap[this.props.poolKey] || {
            key: this.props.poolKey,
            judges: {},
            teamData: []
        }

        this.state = {
            isJudgesWidgetEnabled: false
        }

        registerCollapseCallback(() => {
            this.state.isJudgesWidgetEnabled = false
            this.setState(this.state)
        })
    }

    onAddTeam(e) {

    }

    getAddTeamOptions() {
        let divisionData = MainStore.eventData.eventData.divisionData[this.props.divisionName]
        if (divisionData === undefined || divisionData.teams === undefined) {
            return []
        }

        let poolDatas = this.props.roundData.poolNames.map((poolName) => {
            return MainStore.eventData.eventData.poolMap[Common.makePoolKey(MainStore.eventData.key, this.props.divisionName, this.props.roundData.name, poolName)]
        }).filter((item) => item !== undefined)

        let options = []
        for (let team of divisionData.teams) {
            let teamExists = false
            for (let poolData of poolDatas) {
                teamExists = poolData.teamData.find((teamData) => {
                    return teamData.players.find((playerKey) => {
                        return team[0] === playerKey
                    }) !== undefined
                }) !== undefined

                if (teamExists) {
                    break
                }
            }

            if (!teamExists) {
                options.push({
                    value: team,
                    label: Common.getPlayerNamesString(team)
                })
            }
        }

        return options
    }

    onAddTeamSelected(selected) {
        let poolData = MainStore.eventData.eventData.poolMap[this.props.poolKey]
        poolData.teamData.splice(0, 0, {
            players: selected.value,
            judgeData: {}
        })
    }

    onRemoveNewTeam(index) {
        let poolData = MainStore.eventData.eventData.poolMap[this.props.poolKey]
        poolData.teamData.splice(index, 1)
    }

    moveTeam(index, dir) {
        let poolData = MainStore.eventData.eventData.poolMap[this.props.poolKey]
        let newIndex = index + dir
        if (newIndex < 0 || newIndex >= poolData.teamData.length) {
            return
        }

        let temp = poolData.teamData[newIndex]
        poolData.teamData[newIndex] = poolData.teamData[index]
        poolData.teamData[index] = temp
    }

    getTeamsWidget() {
        let poolData = MainStore.eventData.eventData.poolMap[this.props.poolKey]
        // Does not support ties
        let sortedScores = []
        for (let teamData of poolData.teamData) {
            if (teamData.teamScore !== undefined) {
                sortedScores.push(teamData.teamScore)
            }
        }
        sortedScores.sort((a, b) => b - a)
        let widgets = poolData.teamData.map((teamData, index) => {
            let sortedScoreIndex = sortedScores.findIndex((score) => score === teamData.teamScore)
            let teamRank = sortedScoreIndex >= 0 ? sortedScoreIndex + 1 : undefined
            if (teamRank !== undefined) {
                return (
                    <div key={Math.random()} className="team">
                        {`${index + 1}. ${Common.getPlayerNamesString(teamData.players)} (${Common.getPlaceFromNumber(teamRank)})`}
                    </div>
                )
            } else {
                return (
                    <div key={Math.random()} className="team">
                        <button onClick={() => this.onRemoveNewTeam(index)}>X</button>
                        {`${index + 1}. ${Common.getPlayerNamesString(teamData.players)}`}
                        <button onClick={() => this.moveTeam(index, -1)}>^</button>
                        <button onClick={() => this.moveTeam(index, 1)}>v</button>
                    </div>
                )
            }
        })
        return (
            <div className="teams">
                {widgets}
            </div>
        )
    }

    onAddJudge(playerKey, category) {
        let poolData = MainStore.eventData.eventData.poolMap[this.props.poolKey]
        poolData.judges[playerKey] = category
    }

    onSelectJudgesClick() {
        this.state.isJudgesWidgetEnabled = !this.state.isJudgesWidgetEnabled
        this.setState(this.state)
    }

    getJudgeSelectWidget() {
        let judgeWidgets = []
        let filteredPlayerKeys = []
        let poolData = MainStore.eventData.eventData.poolMap[this.props.poolKey]
        for (let playerKey in MainStore.eventData.eventData.playerData) {
            if (!Common.poolDataContainsCompetitor(poolData, playerKey) && !Common.poolDataContainsJudge(poolData, playerKey)) {
                filteredPlayerKeys.push(playerKey)
            }
        }

        filteredPlayerKeys.sort((a, b) => {
            return Common.getPlayerRankingPointsByDivision(b) - Common.getPlayerRankingPointsByDivision(a)
        })

        for (let playerKey of filteredPlayerKeys) {
            let playerData = MainStore.playerData[playerKey]
            let isPlayingInOtherPool = Common.isPlayerPlayingInOtherPoolInRound(playerKey, this.props.divisionName, this.props.roundData.name, this.props.poolName)
            let title = isPlayingInOtherPool ? "Playing in other Pool" : undefined
            let cn = `judge ${isPlayingInOtherPool ? "playingInOtherPool" : ""}`
            judgeWidgets.push(
                <div key={playerKey} className={cn} title={title}>
                    <button onClick={() => this.onAddJudge(playerKey, "Diff")}>Diff</button>
                    <button onClick={() => this.onAddJudge(playerKey, "Variety")}>Variety</button>
                    <button onClick={() => this.onAddJudge(playerKey, "ExAi")}>ExAi</button>
                    <div className="name">
                        {Common.getPlayerNameString(playerKey)}
                    </div>
                    <div className="country">
                        {playerData.country || "UKN"}
                    </div>
                    <div className="count">
                        {Common.getPlayerJudgedCount(playerKey)}
                    </div>
                </div>
            )
        }

        if (this.state.isJudgesWidgetEnabled) {
            return (
                <div>
                    <div className="selectJudges" onClick={() => this.onSelectJudgesClick()}>
                        Select Judges
                    </div>
                    <div>
                        {judgeWidgets}
                    </div>
                </div>
            )
        } else {
            return (
                <div>
                    <div className="selectJudges" onClick={() => this.onSelectJudgesClick()}>
                        Select Judges
                    </div>
                </div>
            )
        }
    }

    removeJudge(judgeKey) {
        let poolData = MainStore.eventData.eventData.poolMap[this.props.poolKey]
        delete poolData.judges[judgeKey]
    }

    getJudgesWidget() {
        let poolData = MainStore.eventData.eventData.poolMap[this.props.poolKey]
        let judgeKeys = Common.getSortedJudgeKeyArray(poolData)
        let judgeWidgets = judgeKeys.map((key) => {
            let category = poolData.judges[key]
            let isPlayingInOtherPool = Common.isPlayerPlayingInOtherPoolInRound(key, this.props.divisionName, this.props.roundData.name, this.props.poolName)
            let cn = isPlayingInOtherPool ? "playingInOtherPool" : ""
            let title = isPlayingInOtherPool ? "Playing in other Pool" : undefined
            return (
                <div key={key} className={cn} title={title}>
                    <button onClick={() => this.removeJudge(key)}>X</button>
                    {`${category}: ${Common.getPlayerNameString(key)} (${Common.getPlayerJudgedCount(key)})`}
                </div>
            )
        })
        return (
            <div>
                <div>
                    Judges
                </div>
                <div>
                    {judgeWidgets}
                </div>
            </div>
        )
    }

    onDeletePool() {
        let index = this.props.roundData.poolNames.findIndex((name) => name === this.props.poolName)
        this.props.roundData.poolNames.splice(index, 1)

        delete MainStore.eventData.eventData.poolMap[this.props.poolKey]
    }

    render() {
        return (
            <div className="poolWidget">
                {`${this.props.divisionName} ${this.props.roundData.name} ${this.props.poolName}`}
                <button onClick={() => this.onDeletePool()}>Delete Pool</button>
                <h3>
                    Teams
                </h3>
                <div className="addTeamWidget">
                    Add Team
                    <ReactSelect value={null} options={this.getAddTeamOptions()} onChange={(e) => this.onAddTeamSelected(e)} />
                    {this.getTeamsWidget()}
                </div>
                <div className="judgeWidget">
                    {this.getJudgeSelectWidget()}
                    {this.getJudgesWidget()}
                </div>
            </div>
        )
    }
})

ReactDOM.render(
    <EventCreator />,
    document.getElementById("mount")
)

module.exports = EventCreator
