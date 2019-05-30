import * as fs from 'fs';
import * as $G from '../../src/core/Graph';
import * as $JSON from '../../src/io/input/JSONInput';
import * as $CSV from '../../src/io/input/CSVInput';
import { PRArrayDS, PageRankRandomWalk } from '../../src/centralities/PageRankRandomWalk';

import { Logger } from '../../src/utils/logger';
const logger = new Logger();

const EPSILON = 1e-6;
const DIGITS = 6; // inverse of epsilon (number of digits after the decimal, for jest)

const TEST_PATH_PREFIX = "./test/test_data/",
			PATH_PREFIX_CENTRALITIES = TEST_PATH_PREFIX + "centralities/";

let csv: $CSV.ICSVInput = new $CSV.CSVInput(" ", false, false),
	json: $JSON.IJSONInput = new $JSON.JSONInput(true, false, true),
	deg_cent_graph = `search_graph_pfs_extended.json`,
	pr_3nodes_file = `centralities/3node2SPs1direct.json`,
	sn_300_file = `social_network_edges_300.csv`,
	sn_1K_file = `social_network_edges_1K.csv`,
	sn_20K_file = `social_network_edges_20K.csv`,
	graph_unweighted_undirected = `network_undirected_unweighted.csv`,
	pagerank_py_folder = `centralities/pagerank`,
	graph: $G.IGraph = json.readFromJSONFile(TEST_PATH_PREFIX + deg_cent_graph),
	graph_und_unw = csv.readFromEdgeListFile(TEST_PATH_PREFIX + graph_unweighted_undirected);


describe("PageRank Centrality Tests", () => {
	let n3_graph = null;

	beforeAll(() => {
		n3_graph = new $JSON.JSONInput(true, false, false).readFromJSONFile(TEST_PATH_PREFIX + pr_3nodes_file);
	});


	describe('constructor correctly sets class properties', () => {



		test('if personalized, checks for existence of tele_set - throws error otherwise', () => {
			let prConstrWrapper = () => {
				return new PageRankRandomWalk(n3_graph, {
					personalized: true
				});
			};
			expect(prConstrWrapper).toThrow('Personalized Pagerank requires tele_set as a config argument');
		});

	});


	describe('constructor correctly initializes PageRank RandomWalk data structures - ', () => {

		test('correctly initialized PageRank configuration from default values', () => {
			let PR = new PageRankRandomWalk(graph);
			expect(PR.getConfig()).toEqual({
				_weighted: false,
				_alpha: 0.15,
				_maxIterations: 1e3,
				_convergence: 1e-6,
				_normalize: false,
				// _init: 1 / graph.nrNodes()
			});
		});


		test('correctly constructs current & old array', () => {
			let pr_init = [0.3333333333333333,0.3333333333333333,0.3333333333333333];
			let pageRank = new PageRankRandomWalk(n3_graph);
			expect(pageRank.getDSs().curr).toEqual(pr_init);
		});


		test('correctly constructs old array', () => {
			let pr_init = [0.3333333333333333,0.3333333333333333,0.3333333333333333];
			let pageRank = new PageRankRandomWalk(n3_graph);
			expect(pageRank.getDSs().old).toEqual(pr_init);
		});


		test('correctly constructs out degree array', () => {
			let deg_init = [2,0,1];
			let pageRank = new PageRankRandomWalk(n3_graph);
			expect(pageRank.getDSs().out_deg).toEqual(deg_init);
		});


		test('correctly constructs `pull` 2D array', () => {
			let pull_expect = [[],[0,2],[0]];
			let pageRank = new PageRankRandomWalk(n3_graph);
			expect(pageRank.getDSs().pull).toEqual(pull_expect);			
		});


		test('correctly constructs tele_set & tele_size for NON_PPR', () => {
			let teleport_expect = null,
					tele_size_expect = null;
			let pageRank = new PageRankRandomWalk(n3_graph);
			expect(pageRank.getDSs().teleport).toEqual(teleport_expect);
			expect(pageRank.getDSs().tele_size).toEqual(tele_size_expect);
		});


		test('correctly constructs tele_set & tele_size for PPR, teleset={A}', () => {
			let teleport_expect = [1, 0, 0],
					tele_size_expect = 1;
			let pageRank = new PageRankRandomWalk(n3_graph, {
				personalized: true,
				tele_set: {"A": 1}
			});
			expect(pageRank.getDSs().teleport).toEqual(teleport_expect);
			expect(pageRank.getDSs().tele_size).toEqual(tele_size_expect);
		});


		test('correctly constructs tele_set & tele_size for PPR, teleset={A, B}', () => {
			let teleport_expect = [0.5, 0.5, 0],
					tele_size_expect = 2;
			let pageRank = new PageRankRandomWalk(n3_graph, {
				personalized: true,
				tele_set: {"A": 0.5, "B": 0.5}
			});
			expect(pageRank.getDSs().teleport).toEqual(teleport_expect);
			expect(pageRank.getDSs().tele_size).toEqual(tele_size_expect);
		});


		test('correctly *normalizes* tele_set={A: 0.5, B: 0.5}', () => {
			let teleport_expect = [0.5, 0.5, 0],
					tele_size_expect = 2;
			let pageRank = new PageRankRandomWalk(n3_graph, {
				personalized: true,
				tele_set: {"A": 3, "B": 3}
			});
			expect(pageRank.getDSs().teleport).toEqual(teleport_expect);
			expect(pageRank.getDSs().tele_size).toEqual(tele_size_expect);
		});


		test('throws Error if init_map is given but not of correct size (# nodes)', () => {
			let prConstrWrapper = () => {
				return new PageRankRandomWalk(n3_graph, {
					init_map: {"A": 0.5, "B": 0.5}
				});
			};
			expect(prConstrWrapper).toThrow('init_map config parameter must be of size |nodes|');
		});


		test('throws Error if init_map is given, but does not contain all node IDs', () => {
			let prConstrWrapper = () => {
				return new PageRankRandomWalk(n3_graph, {
					init_map: {"A": 0.5, "B": 0.5, "meNotExists": 17}
				});
			};
			expect(prConstrWrapper).toThrow('initial value must be given for each node in the graph.');
		});


		test('correctly constructs initial values if init_map is given', () => {
			let init_expect = [0.5, 0.4, 0.1];

			let pageRank = new PageRankRandomWalk(n3_graph, {
				init_map: {"A": 0.5, "B": 0.4, "C": 0.1}
			});
			expect(pageRank.getDSs().curr).toEqual(init_expect);
			expect(pageRank.getDSs().old).toEqual(init_expect);
		});


		test('correctly normalizes initial values if init_map is given', () => {
			let init_expect = [0.5, 0.4, 0.1];

			let pageRank = new PageRankRandomWalk(n3_graph, {
				init_map: {"A": 5, "B": 4, "C": 1}
			});
			expect(pageRank.getDSs().curr).toEqual(init_expect);
			expect(pageRank.getDSs().old).toEqual(init_expect);
		});


		/**
		 * One array construction is tested properly there is no reason to test this...
		 */
		test('throws error when out degree of a given node in the pull array is zero', () => {
			let erroneousDS = {
				"curr": [0.3333333333333333,0.3333333333333333,0.3333333333333333],
				"old": [0.3333333333333333,0.3333333333333333,0.3333333333333333],
				"out_deg": [2,0,1],
				"pull": [[1],[0,2],[0]]
			}
			let pageRank = new PageRankRandomWalk(graph, {PRArrays: erroneousDS});
			expect(pageRank.computePR.bind(pageRank)).toThrow('Encountered zero divisor!');
		});

	});


	/**
	 * It's not testing for what the title says...
	 * 
	 * @todo how to measure 'short time'?
	 */
	test('should stop random walk after few iterations', () => {
		const convergence = 0.3;

		let pagerank = new PageRankRandomWalk(graph, {
			alpha: 1e-1,
			convergence: convergence
		}).computePR();

		for (let key in pagerank) {
			expect(pagerank[key]).toBeLessThan(convergence);
		}
	});


	/**
	 * @todo test iterations -> best with spy on an iterating method
	 */
	test('should not stop random walk with convergence criteria but with iterations', () => {
		const max_rank = 0.2;

		let pagerank = new PageRankRandomWalk(graph_und_unw, {
			alpha: 1e-1,
			convergence: 1e-13,
			iterations: 2
		}).computePR();

		for (let key in pagerank) {
			expect(pagerank[key]).toBeLessThan(max_rank);
		}
	});


	test('RW UN-weighted result should equal NetworkX results - simple pr_3node_graph', () => {
		let PR = new PageRankRandomWalk(n3_graph, {
			convergence: 1e-6,
			alpha: 0.15,
			weighted: false,
			normalize: true
		});
		let result = PR.computePR();
		logger.log(JSON.stringify(result));

		const nxControl = {'A': 0.19757959373228612, 'B': 0.5208692975273156, 'C': 0.2815511087403978}
		logger.log(JSON.stringify(nxControl));

		Object.keys(result).forEach(n => expect(result[n]).toBeCloseTo(nxControl[n], DIGITS));
	});


	test.only('RW WEIGHTED result should equal NetworkX results - simple pr_3node_graph', () => {
		n3_graph = new $JSON.JSONInput(true, false, true).readFromJSONFile(TEST_PATH_PREFIX + pr_3nodes_file);
		let PR = new PageRankRandomWalk(n3_graph, {
			convergence: 1e-6,
			alpha: 0.15,
			weighted: true,
			normalize: true
		});
		
		logger.log(JSON.stringify(PR.getDSs()));

		let result = PR.computePR();
		logger.log(JSON.stringify(result));

		const nxControl = {'A': 0.1924769023070071, 'B': 0.502859162757028, 'C': 0.3046639349359649};
		logger.log(JSON.stringify(nxControl));

		Object.keys(result).forEach(n => expect(result[n]).toBeCloseTo(nxControl[n], DIGITS));
	});


	/**
	 * TELEPORT SET TESTS
	 */
	[{
		teleport_set: {'A': 1},
		nx_control: {'A': 0.45223280658663706, 'B': 0.3555684605482446, 'C': 0.19219873286511846}
	 },
	 {
		teleport_set: {'A': .5, 'B': .5},
		nx_control: {'A': 0.3114049634796294, 'B': 0.5562477948603342, 'C': 0.13234724166003645}
	 },
	 {
		teleport_set: {'A': 5, 'B': 5},
		nx_control: {'A': 0.3114049634796294, 'B': 0.5562477948603342, 'C': 0.13234724166003645}
	 },
	 {
		teleport_set: {'A': .1, 'B': .3, 'C': .6},
		nx_control: {'A': 0.061307327133222844, 'B': 0.5447930310348754, 'C': 0.3938996418319016}
	 }
	].forEach( teleports => {
		test('RW result should equal NetworkX results - teleport set', () => {
			let PR = new PageRankRandomWalk(n3_graph, {
				convergence: 1e-6,
				alpha: 0.15,
				weighted: false,
				normalize: true,
				personalized: true,
				tele_set: teleports.teleport_set
			});
			let result = PR.computePR();
			logger.log(JSON.stringify(result));

			const nxControl = teleports.nx_control
			logger.log(JSON.stringify(nxControl));

			Object.keys(result).forEach(n => expect(result[n]).toBeCloseTo(nxControl[n], DIGITS));
		});
	});


	/**
	 * INIT VALUE TESTS
	 * 
	 * @todo seem to have no effect at all... NOT EVEN on the number of iterations (on a 3-node graph...)
	 */
	[{
		init_map: {'A': 4, 'B': 3, 'C': 101},
		nx_control: {'A': 0.1975796534128556, 'B': 0.5208691936886545, 'C': 0.2815511528984896}
	 },
	 {
		init_map: {'A': 404, 'B': 3, 'C': 1e-7},
		nx_control: {'A': 0.1975796534128556, 'B': 0.5208691936886545, 'C': 0.2815511528984896}
	 }
	].forEach( inits => {
		test('RW result should equal NetworkX results - init map', () => {
			let PR = new PageRankRandomWalk(n3_graph, {
				convergence: 1e-6,
				alpha: 0.15,
				weighted: false,
				normalize: true,
				init_map: inits.init_map
			});
			let result = PR.computePR();
			logger.log(JSON.stringify(result));

			const nxControl = inits.nx_control
			logger.log(JSON.stringify(nxControl));

			Object.keys(result).forEach(n => expect(result[n]).toBeCloseTo(nxControl[n], DIGITS));
		});
	});


	/**
	 * COMPARISON TESTS BETWEEN "DEFAULT INIT" AND "RANDOM INIT MAP" ON 333 NODE GRAPH
	 * 
	 * @todo - Check for a mathematically sound explanation of why differently initialized graphs will converge to *about* the same static distribution
	 * @todo - figure out why they don't converge to the *exact* same solution...
	 */
	test('default & random INIT on 333 node graph should give similar results, but in a different number of iterations', () => {
		let sn_graph = csv.readFromEdgeListFile(TEST_PATH_PREFIX + sn_300_file);
		let results = {
			default_init: {},
			random_init: {}
		};
		let random_init_map = {};
		Object.keys(sn_graph.getNodes()).forEach(n => random_init_map[n] = Math.random());

		let PR = new PageRankRandomWalk(sn_graph, {normalize: true});
		results.default_init = PR.computePR();
		PR = new PageRankRandomWalk(sn_graph, {normalize: true, init_map: random_init_map});
		results.random_init = PR.computePR();

		Object.keys(results.default_init).forEach(n => expect(results.default_init[n]).toBeCloseTo(results.random_init[n], 4));
	});


	/**
	 * PERFORMANCE TESTS UNWEIGHTED
	 * 
	 * Also checking against the python implementation
	 * 
	 * @todo figure out why the 20k graph shows significantly different results 
	 * 			 while the 300 & 1k graphs are at least OK with an epsilon = 1e-4
	 * @todo Extract out into seperate performance test suite !!
	 */
	describe('Page Rank Random Walk performance tests on actual (small) social graphs - ', () => {
		[sn_300_file, sn_1K_file].forEach(graph_file => { //sn_300_file, sn_1K_file, sn_20K_file
			test('should calculate the PR via Random Walk for graphs of realistic size', () => {
				let sn_graph = csv.readFromEdgeListFile(TEST_PATH_PREFIX + graph_file);
				let PR = new PageRankRandomWalk(sn_graph, {
					convergence: EPSILON,
					normalize: true
				});

				let tic = +new Date;
				let result = PR.computePR();
				let toc = +new Date;
				logger.log(`PageRank Random Walk ARRAY version for ${graph_file} graph took ${toc - tic} ms.`)

				let controlFileName = `${TEST_PATH_PREFIX}${pagerank_py_folder}/pagerank_${graph_file}_results.json`;
				let nxControl = JSON.parse(fs.readFileSync(controlFileName).toString());

				// Length
				expect(Object.keys(result).length).toEqual(sn_graph.nrNodes());
				expect(Object.keys(result).length).toBe(Object.keys(nxControl).length);
				// Structure
				expect(Object.keys(result)).toEqual(Object.keys(nxControl));
				// Content
				/**
				 * @todo problem lies in the fact that before normalization we get ridiculously heigh numbers (PR(some_node) = 2.5 !!!)...
				 * @todo also check dangling nodes
				 */
				Object.keys(result).forEach(n => expect(result[n]).toBeCloseTo(nxControl[n], 4));

			});

		});

	});

});
