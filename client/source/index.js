"use strict"

const React = require("react")
const ReactDOM = require("react-dom")
const MobxReact = require("mobx-react")
const Fuzzysort = require("fuzzysort")
const ReactSelect = require("react-select").default

const MainStore = require("mainStore.js")
const Common = require("common.js")
const PlayersMainWidget = require("playersMainWidget.js")
const PlayersSideWidget = require("playersSideWidget.js")

require("index.less")

@MobxReact.observer class Main extends React.Component {
    constructor() {
        super()

        Common.downloadPlayerAndEventData().then(() => {
            Common.loadFromLocalStorage()
        })
    }

    render() {
        return (
            <div>
                <button onClick={() => Common.saveToLocalStorage()}>Save</button>
                <EventWidget />
                <div className="bodyContainer">
                    <PlayersSideWidget />
                    <div className="mainWidget">
                        <PlayersMainWidget />
                        <DivisionListWidget />
                    </div>
                </div>
            </div>
        )
    }
}

@MobxReact.observer class EventWidget extends React.Component {
    constructor() {
        super()
    }

    onSelectEventChanged(e) {
        MainStore.selectedEventKey = e.target.value
    }

    onEventNameChanged(e) {
        MainStore.eventData.eventName = e.target.value
        Common.onEventDataChanged()
    }

    render() {
        if (MainStore.eventDirectory === undefined) {
            return <h1>No Event Directory</h1>
        }

        let eventKeys = []
        for (let eventKey in MainStore.eventDirectory) {
            eventKeys.push(eventKey)
        }

        let eventOptions = eventKeys.map((eventKey, i) => {
            return <option key={i} value={i}>{MainStore.eventDirectory[eventKey].eventName}</option>
        })
        return (
            <div>
                <form>
                    <label>
                        {"Select Event: "}
                        <select value={MainStore.selectedEventKey} onChange={(e) => this.onSelectEventChanged(e)}>
                            {eventOptions}
                        </select>
                    </label>
                    <label>
                        {"Event Name: "}
                        <input type="text" value={MainStore.eventData && MainStore.eventData.eventName || "No Event"} onChange={(e) => this.onEventNameChanged(e)} />
                    </label>
                    <label>
                        Event Id: {MainStore.eventData && MainStore.eventData.eventKey || "No Event"}
                    </label>
                    <button onClick={() => Common.createNewEventData()} disabled={MainStore.eventData !== undefined}>Create New Event Data</button>
                </form>
            </div>
        )
    }
}

@MobxReact.observer class DivisionListWidget extends React.Component {
    constructor() {
        super()
    }

    onAddDivision() {
        MainStore.eventData.eventData.divisionData["Open Pairs"] = {
            name: "Open Pairs",
            headJudge: "123-123",
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
                <button className="addDivisionButton" onClick={(e) => this.onAddDivision(e)}>+</button>
                Divisions
                {this.getDivisionWidgets()}
            </div>
        )
    }
}

@MobxReact.observer class DivisionWidget extends React.Component {
    constructor() {
        super()

        this.state = {
            isTeamWidgetEnabled: true,
            inputTeamsText: "",
            parsedTeamWidgets: undefined,
            parsedTeamState: []
        }
    }

    onAddRound(e) {
        this.props.divisionData.roundData["Finals"] = {
            name: "Finals",
            lengthSeconds: 180,
            poolNames: []
        }
    }

    getRoundWidgets() {
        let roundWidgets = []
        for (let roundName in this.props.divisionData.roundData) {
            let roundData = this.props.divisionData.roundData[roundName]
            roundWidgets.push(<RoundWidget key={roundWidgets.length} roundData={roundData} divisionName={this.props.divisionData.name} />)
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
                let fuzzyResults = Fuzzysort.go(name.trim(), MainStore.cachedRegisteredFullNames)
                let options = fuzzyResults.map((result) => {
                    return {
                        value: result.target,
                        label: result.target
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

        return this.props.divisionData.teams.map((playerKeys) => {
            return (
                <div key={Math.random()}>
                    <button onClick={() => this.onRemoveNewTeam(playerKeys)}>X</button>
                    {Common.getPlayerNamesString(playerKeys)}
                </div>
            )
        })
    }

    getTeamsWidget() {
        if (this.state.isTeamWidgetEnabled !== true) {
            return (
                <div className="teamsWidget">
                    <h3 onClick={() => this.onTeamsWidgetClicked()}>
                        Teams
                    </h3>
                </div>
            )
        } else {
            return (
                <div className="teamsWidget enabled">
                    <h3 onClick={() => this.onTeamsWidgetClicked()}>
                        Teams
                    </h3>
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
                        <div>
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

    render() {
        return (
            <div className="divisionWidget">
                {this.props.divisionData.name}
                <div className="roundsContainer">
                    <button className="addRoundButton" onClick={(e) => this.onAddRound(e)}>+</button>
                    {this.getTeamsWidget()}
                    Rounds
                    {this.getRoundWidgets()}
                </div>
            </div>
        )
    }
}

@MobxReact.observer class RoundWidget extends React.Component {
    constructor() {
        super()
    }

    onAddPool(e) {
        this.props.roundData.poolNames.push("A")
    }

    getPoolWidgets() {
        return this.props.roundData.poolNames.map((name, i) => {
            let poolKey = Common.makePoolKey(MainStore.eventData.key, this.props.divisionName, this.props.roundData.name, name)
            return <PoolWidget key={i} divisionName={this.props.divisionName} poolName={name} poolKey={poolKey} />
        })
    }

    render() {
        return (
            <div className="roundWidget">
                {this.props.roundData.name}
                <div className="roundsContainer">
                    <button className="addPoolButton" onClick={(e) => this.onAddPool(e)}>+</button>
                    Pools
                    {this.getPoolWidgets()}
                </div>
            </div>
        )
    }
}

@MobxReact.observer class PoolWidget extends React.Component {
    constructor(props) {
        super(props)

        MainStore.eventData.eventData.poolMap[this.props.poolKey] = MainStore.eventData.eventData.poolMap[this.props.poolKey] || {
            key: this.props.poolKey,
            judges: {},
            teamData: []
        }
        this.poolData = MainStore.eventData.eventData.poolMap[this.props.poolKey]
    }

    onAddTeam(e) {

    }

    getAddTeamOptions() {
        let options = []
        for (let team of MainStore.eventData.eventData.divisionData[this.props.divisionName].teams) {
            let teamExists = this.poolData.teamData.find((teamData) => {
                return teamData.players.find((playerKey) => {
                    return team[0] === playerKey
                }) !== undefined
            }) !== undefined

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
        this.poolData.teamData.push({
            players: selected.value,
            judgeData: {}
        })
    }

    getTeamsWidget() {
        let widgets = this.poolData.teamData.map((teamData, index) => {
            return (
                <div key={Math.random()} className="team">
                    <button>X</button>
                    {index + 1}.
                    <div>
                        {Common.getPlayerNamesString(teamData.players)}
                    </div>
                    <button>^</button>
                    <button>v</button>
                </div>
            )
        })
        return (
            <div className="teams">
                {widgets.reverse()}
            </div>
        )
    }

    render() {
        return (
            <div className="poolWidget">
                {`Pool ${this.props.poolName}`}
                <h3>
                    Teams
                </h3>
                <div>
                    Add Team
                    <ReactSelect value={null} options={this.getAddTeamOptions()} onChange={(e) => this.onAddTeamSelected(e)} />
                    {this.getTeamsWidget()}
                </div>
                <div>
                    Judges
                </div>
            </div>
        )
    }
}

ReactDOM.render(
    <Main />,
    document.getElementById("mount")
)
