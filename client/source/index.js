"use strict"

const React = require("react")
const ReactDOM = require("react-dom")
const MobxReact = require("mobx-react")

const MainStore = require("mainStore.js")
const Common = require("common.js")
const PlayersMainWidget = require("playersMainWidget.js")
const PlayersSideWidget = require("playersSideWidget.js")

require("index.less")


@MobxReact.observer class Main extends React.Component {
    constructor() {
        super()

        Common.downloadPlayerAndEventData()
    }

    render() {
        return (
            <div>
                Event Creator
                <EventWidget />
                <div className="bodyContainer">
                    <PlayersSideWidget />
                    <div className="mainWidget">
                        <PlayersMainWidget />
                        <DivisionsWidget />
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
        MainStore.selectedEventIndex = e.target.value
    }

    onEventNameChanged(e) {
        Common.getEventData().eventName = e.target.value
        Common.onEventDataChanged()
    }

    render() {
        let eventOptions = MainStore.eventList.map((data, i) => {
            return <option key={i} value={i}>{data.eventName}</option>
        })
        return (
            <div>
                <form>
                    <label>
                        {"Select Event: "}
                        <select value={MainStore.selectedEventIndex} onChange={(e) => this.onSelectEventChanged(e)}>
                            {eventOptions}
                        </select>
                    </label>
                    <label>
                        {"Event Name: "}
                        <input type="text" value={Common.getEventData().eventName} onChange={(e) => this.onEventNameChanged(e)} />
                    </label>
                    <label>
                        Event Id: {Common.getEventData().eventId}
                    </label>
                </form>
            </div>
        )
    }
}

@MobxReact.observer class DivisionsWidget extends React.Component {
    constructor() {
        super()
    }

    onAddDivision(e) {

    }

    getDivisionWidgets() {
        return Common.getEventData().setupData.divisions.map((data, i) => {
            return <DivisionWidget key={i} divisionData={data} />
        })
    }

    render() {
        return (
            <div className="divisionsWidget">
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
    }

    onAddRound(e) {

    }

    getRoundWidgets() {
        return this.props.divisionData.rounds.map((data, i) => {
            return <RoundWidget key={i} roundData={data} />
        })
    }

    render() {
        return (
            <div className="divisionWidget">
                {this.props.divisionData.name}
                <div className="roundsContainer">
                    <button className="addRoundButton" onClick={(e) => this.onAddRound(e)}>+</button>
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

    }

    getPoolWidgets() {
        return this.props.roundData.pools.map((data, i) => {
            return <PoolWidget key={i} poolData={data} />
        })
    }

    render() {
        return (
            <div className="roundWidget">
                {Common.getRoundNameFromNumber(this.props.roundData.roundNumber)}
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
    constructor() {
        super()
    }

    onAddTeam(e) {

    }

    render() {
        return (
            <div className="poolWidget">
                {`Pool ${this.props.poolData.name}`}
                <div>
                    Teams
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
