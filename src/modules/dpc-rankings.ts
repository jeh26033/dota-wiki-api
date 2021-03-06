import * as cheerio from 'cheerio';
import fetch, { RequestInit } from 'node-fetch';

import { Base, IDotaWikiConfig } from '../utils/base';

export interface IRankKey {
    rank?: string;
    team?: string;
}

export interface IRank {
    errorMsg?: string;
    hasError?: boolean;
    isClinched: boolean;
    isIneligible: boolean;
    rank: string;
    score: string;
    team: string;
}

export class DPCRankings extends Base {

    constructor(config: IDotaWikiConfig) {
        super(config);
    }

    /**
     * Fetches rank object of team at given rank value
     *
     * @param {string} rank Rank number (as string)
     * @returns {Promise<IRank>}
     * @memberof DPCRankings
     */
    public getRankByStanding(rank: string): Promise<IRank> {
        return new Promise((resolve, reject) => {
            const fullRankings = this.getRankings();
            fullRankings
                .then((rankmap: Map<IRankKey, IRank>) => {
                    for (const key of rankmap.keys()) {
                        if (key.rank === rank) {
                            resolve(rankmap.get(key));
                        }
                    }
                    reject({
                        errorMsg: 'No team at the given rank',
                        hasError: true,
                        isClinched: false,
                        isIneligible: false,
                        rank: null,
                        score: null,
                        team: null,
                    });
                })
                .catch((err: any) => {
                    reject({
                        error: `Error attempting to fetch rank data\n${err}`,
                        hasError: true,
                        isClinched: false,
                        isIneligible: false,
                        rank: null,
                        score: null,
                        team: null,
                    });
                });
        });
    }

    /**
     * Fetches rank object of team at with a matching name
     *
     * @param {string} team Team Name (case insensitive)
     * @returns {Promise<IRank>}
     * @memberof DPCRankings
     */
    public getRankByTeam(team: string): Promise<IRank> {
        return new Promise((resolve, reject) => {
            const fullRankings = this.getRankings();
            fullRankings
                .then((rankmap: Map<IRankKey, IRank>) => {
                    for (const key of rankmap.keys()) {
                        if (key.team.toLowerCase() === team.toLowerCase()) {
                            resolve(rankmap.get(key));
                        }
                    }
                    reject({
                        error: 'No team with that name exists',
                        hasError: true,
                        isClinched: false,
                        isIneligible: false,
                        rank: null,
                        score: null,
                        team: null,
                    });
                })
                .catch((err: any) => {
                    reject({
                        error: `Error attempting to fetch rank data\n${err}`,
                        hasError: true,
                        isClinched: false,
                        isIneligible: false,
                        rank: null,
                        score: null,
                        team: null,
                    });
                });
        });
    }

    /**
     * Fetches Map of all teams with DPC Points
     * Map ordered by rank, shows ineligible teams
     *
     * @returns {Promise<Map<IRankKey, IRank> | string>}
     * @memberof DPCRankings
     */
    public getRankings(): Promise<Map<IRankKey, IRank>> {
        return new Promise((resolve, reject) => {
            const requestInfo: RequestInit = {
                headers: {
                    'Accept-Encoding': 'gzip',
                    'User-Agent': this.userAgentValue,
                },
                method: 'GET',
            };
            this.cacheFetch.cacheFetch(`${this.cacheFetch.urlStub}?action=parse&format=json&page=Dota_Pro_Circuit/Rankings/Teams`, requestInfo)
                .then((json: any) => {
                    resolve(this._parseRanks(json.parse.text['*']));
                })
                .catch((err: any) => {
                    reject(`Error fetching team list: ${err}`);
                });
        });
    }

    private _parseRanks(tableHtml: string): Map<IRankKey, IRank> {
        const $ = cheerio.load(tableHtml);
        const rankTableRows = $('.wikitable').eq(0).find('tr');
        const RANK_TABLE_OFFSET = 2; // Index offset to handle the fact that the first two rows are for header elements
        const CLINCHED_COLOR_INDICATOR = 'background-color:rgb(204,255,204)';
        const INELIGIBLE_COLOR_INDICATOR = 'background-color:rgb(255,204,204)';
        const ranks = new Map<IRankKey, IRank>();
        for (let i = RANK_TABLE_OFFSET, len = rankTableRows.length; i < len; i++) {
            const thisRow = rankTableRows.eq(i);
            if (!thisRow.hasClass('expand-child')) {
                const isClinched = thisRow.attr('style') === CLINCHED_COLOR_INDICATOR;
                const isIneligible = thisRow.attr('style') === INELIGIBLE_COLOR_INDICATOR;
                const rank = thisRow.find('td').eq(0).find('b').eq(0).text();
                const team = thisRow.find('td').eq(1).find('.team-template-text a').eq(0).text();
                const score = thisRow.find('td').eq(2).find('b').eq(0).text();
                ranks.set({ rank, team }, { rank, team, score, isClinched, isIneligible });
            }
        }

        return ranks;
    }
}
