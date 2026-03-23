const table = document.querySelector("table tbody");
const submitBtn = document.getElementById("submit-form");
const seasons = getSeasons();
let allTeams = [];
let totalGamesPlayed = 0;
let selectedTeamTechGames = 0;
let selectedTeamFlagrantGames = 0;


let currentRows = [];
let currentSort = {
    key: "dateObj",
    direction: "asc"
};

let selectedTeam = {
    id: null,
    name: "",
    abbr: "",
    logo: ""
};

let stats = {
    totalGamesPlayed: 0,
    selectedTeamTechGames: 0,
    selectedTeamFlagrantGames: 0,
    oppTechGames: 0,
    oppFlagGames: 0
};

let dropdownData;

submitBtn.addEventListener("click", function (event) {
    event.preventDefault();

    resetData();

    const id = Number(document.getElementById("selected-team-id").value);
    const selectedSeason = Number(document.getElementById("selected-season").value);
    const team = allTeams.find(team => team.id === id);

    getTeamGames(team, selectedSeason);
});

// function setSelectedTeam(id) {
//     const chosenTeam = dropdownData.find(team => team.id == id);
//     selectedTeam = chosenTeam;
// }



function resetData() {
    const existingLogo = document.querySelector("#team-info .team-logo");
    if (existingLogo) existingLogo.remove();

    table.innerHTML = "";
    currentRows = [];
    currentSort = {
        key: "dateObj",
        direction: "asc"
    };

    selectedTeam = {
        id: null,
        name: "",
        abbrev: "",
        logo: ""
    };

    stats = {
        totalGamesPlayed: 0,
        selectedTeamTechGames: 0,
        selectedTeamFlagrantGames: 0,
        oppTechGames: 0,
        oppFlagGames: 0
    };
}

function getSeasons() {
    const seasons = [];
    const currentYear = 2026;

    for (let i = 0; i <= 9; i++) {
        let yearInt = currentYear - i;

        seasons.push({
            year: yearInt,
            display: ((yearInt - 1)  + '-' + yearInt )
        });
    }

    return seasons;
}

function renderRows(rows) {
    table.innerHTML = rows.map((row) => row.html).join("");
}

function sortRows(key) {
    if (currentSort.key === key) {
        currentSort.direction = currentSort.direction === "asc" ? "desc" : "asc";
    } else {
        currentSort.key = key;
        currentSort.direction = key === "dateObj" ? "asc" : "desc";
    }

    currentRows.sort((a, b) => {
        let aVal = a[key];
        let bVal = b[key];

        if (aVal < bVal) return currentSort.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return currentSort.direction === "asc" ? 1 : -1;
        return 0;
    });

    renderRows(currentRows);
    updateSortIndicators();
}

function updateSortIndicators() {
    document.querySelectorAll("[data-sort]").forEach((th) => {
        const baseText = th.dataset.label || th.textContent.replace(" ▲", "").replace(" ▼", "");
        th.dataset.label = baseText;

        if (th.dataset.sort === currentSort.key) {
            th.textContent = `${baseText} ${currentSort.direction === "asc" ? "▲" : "▼"}`;
        } else {
            th.textContent = baseText;
        }
    });
}

function initSorting() {
    document.querySelectorAll("[data-sort]").forEach((th) => {
        th.style.cursor = "pointer";

        th.addEventListener("click", () => {
            sortRows(th.dataset.sort);
        });
    });

    updateSortIndicators();
}

async function getTeamGames(team, season) {
    setTeamHeader(team);
    // to add season type: &seasontype=3
    const scheduleRes = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${team.id}/schedule?season=${season}`
    );
    const scheduleData = await scheduleRes.json();

    const rows = await Promise.all(
        scheduleData.events.map(async (event) => {
            const teams = event.competitions[0].competitors;
            const chosenTeam = teams.find((obj) => obj.id == team.id);
            const opponent = teams.find((obj) => obj.id != team.id);

            if (!event.competitions[0].status.type.completed) {
                return null;
            }

            totalGamesPlayed++;

            const gameId = event.id;
            const summaryRes = await fetch(
                `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${gameId}`
            );
            const summaryData = await summaryRes.json();

            const teamBoxscore = summaryData.boxscore.teams.find(
                (obj) => obj.team.id == team.id
            );
            const oppBoxscore = summaryData.boxscore.teams.find(
                (obj) => obj.team.id !== team.id
            );

            const dateObj = new Date(event.date);
            const date = formatDate(event.date);
            const oppName = opponent.team.displayName;
            const oppLogo = opponent.team.logos[0].href;

            const teamFlagrants = Number(
                teamBoxscore.statistics.find(
                    (stat) => stat.name === "flagrantFouls"
                )?.displayValue ?? 0
            );

            const teamGameTechs = Number(
                teamBoxscore.statistics.find(
                    (stat) => stat.name === "totalTechnicalFouls"
                )?.displayValue ?? 0
            );

            const oppFlagrants = Number(
                oppBoxscore.statistics.find(
                    (stat) => stat.name === "flagrantFouls"
                )?.displayValue ?? 0
            );

            const oppTechs = Number(
                oppBoxscore.statistics.find(
                    (stat) => stat.name === "totalTechnicalFouls"
                )?.displayValue ?? 0
            );

            if (teamFlagrants > 0) {
                stats.selectedTeamFlagrantGames++;
            }

            if (oppFlagrants > 0) {
                stats.oppFlagGames++;
            }

            if (oppTechs > 0) {
                stats.oppTechGames++;
            }

            return {
                dateObj,
                date,
                oppName,
                oppLogo,
                teamGameTechs,
                teamFlagrants,
                oppTechs,
                oppFlagrants,
                gamesPlayed: 1,
                teamHadTech: teamGameTechs > 0 ? 1 : 0,
                html: `
                    <tr>
                        <td>${date}</td>
                        <td style="vertical-align: middle;">
                            <img class="team-logo" src="${oppLogo}"> ${oppName}
                        </td>
                        <td>${chosenTeam.winner ? "<span class='win'>W</span>" : "<span class='lose'>L</span>"}</td>
                        <td>${teamGameTechs}</td>
                        <td>${teamFlagrants}</td>
                        <td>${oppTechs}</td>
                        <td>${oppFlagrants}</td>
                    </tr>
                `,
            };
        })
    );

    currentRows = rows.filter((row) => row !== null);

    stats.totalGamesPlayed = currentRows.reduce((sum, row) => sum + row.gamesPlayed, 0);
    stats.selectedTeamTechGames = currentRows.reduce((sum, row) => sum + row.teamHadTech, 0);

    currentRows.sort((a, b) => a.dateObj - b.dateObj);

    renderRows(currentRows);

    insertStatSummaryData(team);
    updateSortIndicators();
}

function setTeamHeader(team) {
    const selectedTeamNameEls = document.querySelectorAll(".selected-team-name");
    selectedTeamNameEls.forEach((el) => {
        el.textContent = team.name;
        el.style.color = `#${team.color}`;
    });


    const teamLogoWrap = document.getElementById("logo-wrapper");
    const img = document.createElement("img");

    img.className = "team-logo animate__animated animate__bounceInLeft";
    img.src = team.logo;
    img.alt = `${team.name} logo`;
    teamLogoWrap.append(img);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: "numeric", month: "long", day: "numeric" };
    return new Intl.DateTimeFormat("en-US", options).format(date);
}

function insertStatSummaryData(team) {
    const techPercent = Math.round((stats.selectedTeamTechGames / stats.totalGamesPlayed) * 100) + "%";
    const flagPercent = Math.round((stats.selectedTeamFlagrantGames / stats.totalGamesPlayed) * 100) + "%";
    const oppTechPercent = Math.round((stats.oppTechGames / stats.totalGamesPlayed) * 100) + "%";
    const oppFlagPercent = Math.round((stats.oppFlagGames / stats.totalGamesPlayed) * 100) + "%";

    const selectedTeamAbbrevEls = document.querySelectorAll(".selected-team-abbrev");
    selectedTeamAbbrevEls.forEach((el) => {
        el.textContent = team.abbr;
    });

    document.getElementById("selected-team-games-played").textContent = stats.totalGamesPlayed;
    document.getElementById("selected-team-tech-games").textContent = stats.selectedTeamTechGames;
    document.getElementById("selected-team-flagrant-games").textContent = stats.selectedTeamFlagrantGames;
    document.getElementById("opponent-tech-games").textContent = stats.oppTechGames;
    document.getElementById("opponent-flagrant-games").textContent = stats.oppFlagGames;

    document.getElementById("tech-percent").textContent = techPercent;
    document.getElementById("flag-percent").textContent = flagPercent;
    document.getElementById("opp-tech-percent").textContent = oppTechPercent;
    document.getElementById("opp-flag-percent").textContent = oppFlagPercent;
}

async function getNBATeamIds(allTeams) {
    const teamsArray = [];
    const res = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams`
    );
    let data = await res.json();
    teamsData = data.sports[0].leagues[0].teams;

    teamsData.forEach(item => {
        const newTeamObj = {
            id: Number(item.team.id),
            name: item.team.displayName,
            abbr: item.team.abbreviation,
            color: item.team.color,
            altColor: item.team.alternateColor,
            logo: item.team.logos[0].href,
            teamStats: item.team.links[2].href
        };

        teamsArray.push(newTeamObj);
    });

    return teamsArray;
}

async function init() {
    allTeams = await getNBATeamIds();

    // generate teams dropdown
    const allTeamsSelect = document.getElementById("selected-team-id");

    allTeams.forEach(team => {
        const teamOption = document.createElement("option");
        teamOption.value = team.id;
        teamOption.textContent = team.name;
        if (team.id == 8) teamOption.selected = true;

        allTeamsSelect.appendChild(teamOption);
    });

    // generate season years dropdown
    const seasonSelect = document.getElementById("selected-season");
    seasons.forEach(season => {
        const seasonOption = document.createElement("option");
        seasonOption.value = season.year;
        seasonOption.textContent = season.display;

        seasonSelect.appendChild(seasonOption);
    });



    initSorting();
    getTeamGames(allTeams.find(team => team.id === 8), 2026);
}

init();