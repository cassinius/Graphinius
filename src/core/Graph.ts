/// <reference path="../../typings/tsd.d.ts" />

import * as $N from './Nodes';
import * as $E from './Edges';
import _ = require('lodash');


enum GraphMode {
	INIT, 
	DIRECTED, 
	UNDIRECTED, 
	MIXED
}


interface DegreeDistribution {
	in	: Uint16Array;
	out	: Uint16Array;
	dir	: Uint16Array;
	und	: Uint16Array;
	all	: Uint16Array;
}


interface GraphStats {
	mode					: GraphMode;
	nr_nodes			: number;
	nr_und_edges	: number;
	nr_dir_edges	: number;
	// degree_dist		: DegreeDistribution;
}


interface IGraph {
	_label : string;
	
	getMode() : GraphMode;
	getStats() : GraphStats;
	degreeDistribution() : DegreeDistribution;
	
	// NODE STUFF
	addNode(id: string, opts? : {}) : $N.IBaseNode;
	hasNodeID(id: string) : boolean;
	hasNodeLabel(label: string) : boolean;
	getNodeById(id: string) : $N.IBaseNode;
	getNodeByLabel(label: string) : $N.IBaseNode;
	getNodes() : {[key: string] : $N.IBaseNode};
	nrNodes() : number;
	getRandomNode() : $N.IBaseNode;
	removeNode(node) : void;
	
	
	// get all nodes??
	
	// EDGE STUFF
	addEdge(label: string, node_a : $N.IBaseNode, node_b : $N.IBaseNode, opts? : {}) : $E.IBaseEdge;
	hasEdgeID(id: string) : boolean;
	hasEdgeLabel(label: string) : boolean;
	getEdgeById(id: string) : $E.IBaseEdge;
	getEdgeByLabel(label: string) : $E.IBaseEdge;
	getDirEdges() : {[key: string] : $E.IBaseEdge};
	getUndEdges() : {[key: string] : $E.IBaseEdge};
	
	nrDirEdges() : number;
	nrUndEdges() : number;
	removeEdge(edge: $E.IBaseEdge) : void;
	getRandomDirEdge() : $E.IBaseEdge;
	getRandomUndEdge() : $E.IBaseEdge;
	
	deleteInEdgesOf(node: $N.IBaseNode) : void;
	deleteOutEdgesOf(node: $N.IBaseNode) : void;
	deleteDirEdgesOf(node: $N.IBaseNode) : void;
	deleteUndEdgesOf(node: $N.IBaseNode) : void;
	deleteAllEdgesOf(node: $N.IBaseNode) : void;
	
	// clearEdges all over graph ???
}


class BaseGraph implements IGraph {
	private _nr_nodes = 0;
	private _nr_dir_edges = 0;
	private _nr_und_edges = 0;	
	protected _mode : GraphMode = GraphMode.INIT;
	protected _nodes : { [key: string] : $N.IBaseNode } = {};
	protected _dir_edges : { [key: string] : $E.IBaseEdge } = {}; 
	protected _und_edges : { [key: string] : $E.IBaseEdge } = {};
	
	
	constructor (public _label) {	}
	
	getMode() : GraphMode {
		return this._mode;
	}
	
	getStats() : GraphStats {
		return {
			mode: this._mode,
			nr_nodes: this._nr_nodes,
			nr_und_edges: this._nr_und_edges,
			nr_dir_edges: this._nr_dir_edges
			// degree_dist: this.degreeDistribution()
		}
	}

	/**
	 * We assume graphs in which no node has higher total degree than 65536
	 */
	degreeDistribution() : DegreeDistribution {
		var max_deg : number = 0,
				key			: string,
				node 		: $N.IBaseNode,
				all_deg : number;
				
		for ( key in this._nodes ) {
			if ( !this._nodes.hasOwnProperty(key) ) {
				continue;
			}
			node = this._nodes[key];
			all_deg = node.inDegree() + node.outDegree() + node.degree() + 1;
			max_deg =  all_deg > max_deg ? all_deg : max_deg;
		}
		
		var deg_dist : DegreeDistribution = {
			in:  new Uint16Array(max_deg),
			out: new Uint16Array(max_deg),
			dir: new Uint16Array(max_deg),
			und: new Uint16Array(max_deg),
			all: new Uint16Array(max_deg)
		}
		
		for ( key in this._nodes ) {
			if ( !this._nodes.hasOwnProperty(key) ) {
				continue;
			}
			node = this._nodes[key];
			deg_dist.in[node.inDegree()]++;
			deg_dist.out[node.outDegree()]++;
			deg_dist.dir[node.inDegree() + node.outDegree()]++;
			deg_dist.und[node.degree()]++;
			deg_dist.all[node.inDegree() + node.outDegree() + node.degree()]++;
		}
		// console.dir(deg_dist);
		return deg_dist;
	}
	
	nrNodes() : number {
		return this._nr_nodes;
	}
	
	nrDirEdges() : number {
		return this._nr_dir_edges;
	}
	
	nrUndEdges() : number {
		return this._nr_und_edges;
	}
	
	addNode(id: string, opts? : {}) : $N.IBaseNode {
		var node = new $N.BaseNode(id, opts);
		this._nodes[node.getID()] = node;
		this._nr_nodes += 1;
		return node;
	}
	
	hasNodeID(id: string) : boolean {
		return !!this._nodes[id];
	}
	
	/**
	 * Use hasNodeLabel with CAUTION ->
	 * it has LINEAR runtime in the graph's #nodes
	 */
	hasNodeLabel(label: string) : boolean {
		return !!_.findKey(this._nodes, function(node : $N.IBaseNode) {
			return node.getLabel() === label;
		});
	}
	
	getNodeById(id: string) : $N.IBaseNode {
		var node = this._nodes[id];
		if ( !node ) {
			throw new Error("cannot retrieve node with non-existing ID.");
		}
		return node;
	}
	
	/**
	 * Use getNodeByLabel with CAUTION -> 
	 * it has LINEAR runtime in the graph's #nodes
	 */
	getNodeByLabel(label: string) : $N.IBaseNode {
		var id = _.findKey(this._nodes, function(node : $N.IBaseNode) {
			return node.getLabel() === label;
		});
		var node = this._nodes[id];
		if ( !node ) {
			throw new Error("cannot retrieve node with non-existing Label.");
		}
		return node;
	}
	
	getNodes() : {[key: string] : $N.IBaseNode} {
		return this._nodes;
	}
	
	/**
	 * CAUTION - This function takes linear time in # nodes
	 */
	getRandomNode() : $N.IBaseNode {
		return this.pickRandomProperty(this._nodes);
	}
	
	removeNode(node) : void {
		var rem_node = this._nodes[node.getID()];
		if ( !rem_node ) {
			throw new Error('Cannot remove un-added node.');
		}
		// Edges?
		var in_deg = node.inDegree();
		var out_deg = node.outDegree();
		var deg = node.degree();
		
		// Delete all edges brutally...
		if ( in_deg ) {
			this.deleteInEdgesOf(node);
		}
		if ( out_deg ) {
			this.deleteOutEdgesOf(node);
		}
		if ( deg ) {
			this.deleteUndEdgesOf(node);
		}
		
		delete this._nodes[node.getID()];
		this._nr_nodes -= 1;
	}
	
	hasEdgeID(id: string) : boolean {
		return !!this._dir_edges[id] || !!this._und_edges[id];
	}
	
	/**
	 * Use hasEdgeLabel with CAUTION -> 
	 * it has LINEAR runtime in the graph's #edges
	 */
	hasEdgeLabel(label: string) : boolean {
		var dir_id = _.findKey(this._dir_edges, function(edge : $E.IBaseEdge) {
			return edge.getLabel() === label;
		});
		var und_id = _.findKey(this._und_edges, function(edge : $E.IBaseEdge) {
			return edge.getLabel() === label;
		});		
		return !!dir_id || !!und_id;
	}
	
	getEdgeById(id: string) : $E.IBaseEdge {
		var edge = this._dir_edges[id] || this._und_edges[id];
		if ( !edge ) {
			throw new Error("cannot retrieve edge with non-existing ID.");
		}
		return edge;
	}
	
	/**
	 * Use hasEdgeLabel with CAUTION -> 
	 * it has LINEAR runtime in the graph's #edges
	 */
	getEdgeByLabel(label: string) : $E.IBaseEdge {
		var dir_id = _.findKey(this._dir_edges, function(edge : $E.IBaseEdge) {
			return edge.getLabel() === label;
		});
		var und_id = _.findKey(this._und_edges, function(edge : $E.IBaseEdge) {
			return edge.getLabel() === label;
		});
		var edge = this._dir_edges[dir_id] || this._und_edges[und_id];
		if ( !edge ) {
			throw new Error("cannot retrieve edge with non-existing Label.");
		}
		return edge;
	}
	
	getDirEdges() : {[key: string] : $E.IBaseEdge} {
		return this._dir_edges;
	}
	
	getUndEdges() : {[key: string] : $E.IBaseEdge} {
		return this._und_edges;
	}
		
	addEdge(id: string, node_a : $N.IBaseNode, node_b : $N.IBaseNode, opts? : $E.EdgeConstructorOptions) : $E.IBaseEdge {
		var edge = new $E.BaseEdge(id,
															 node_a,
															 node_b,
															 opts || {});		
		// connect edge to first node anyways			
		node_a.addEdge(edge);
		
		if ( edge.isDirected() ) {
			// add edge to second node too
			node_b.addEdge(edge);			
			this._dir_edges[edge.getID()] = edge;
			this._nr_dir_edges += 1;
			if ( this._nr_und_edges ) {
				this._mode = GraphMode.MIXED;
			}			
			else {
				this._mode = GraphMode.DIRECTED;
			}
		}
		else {
			// add edge to both nodes, except they are the same...
			if ( node_a !== node_b ) {
				node_b.addEdge(edge);
			}
			this._und_edges[edge.getID()] = edge;
			this._nr_und_edges += 1;
			if ( this._nr_dir_edges ) {
				this._mode = GraphMode.MIXED;
			}
			else {
				this._mode = GraphMode.UNDIRECTED;
			}
		}
		return edge;
	}
	
	removeEdge(edge: $E.IBaseEdge) : void {
		var dir_edge = this._dir_edges[edge.getID()];
		var und_edge = this._und_edges[edge.getID()];

		if ( !dir_edge && ! und_edge ) {
			throw new Error('cannot remove non-existing edge.');
		}
		
		var nodes = edge.getNodes();
		nodes.a.removeEdge(edge);
		if ( nodes.a !== nodes.b ) {
				nodes.b.removeEdge(edge);
		}
		
		if ( dir_edge ) {
			delete this._dir_edges[edge.getID()];			
			this._nr_dir_edges -=1;
		} 
		else {
			delete this._und_edges[edge.getID()];
			this._nr_und_edges -=1;
		}
		
		this.updateGraphMode();
	}
	
	// Some atomicity / rollback feature would be nice here...
	deleteInEdgesOf(node: $N.IBaseNode) : void {
		this.checkConnectedNodeOrThrow(node);
		var in_edges = node.inEdges();
		var key 	: string, 
				edge	: $E.IBaseEdge;
		
		for (key in in_edges) {
			if ( !in_edges.hasOwnProperty(key) ) {
				continue;
			}
			edge = in_edges[key];
			edge.getNodes().a.removeEdge(edge);
			delete this._dir_edges[edge.getID()];
			this._nr_dir_edges -=1;		
		}
		node.clearInEdges();
		this.updateGraphMode();
	}
	
	// Some atomicity / rollback feature would be nice here...
	deleteOutEdgesOf(node: $N.IBaseNode) : void {
		this.checkConnectedNodeOrThrow(node);
		var out_edges = node.outEdges();		
		var key 	: string, 
				edge	: $E.IBaseEdge;
		
		for (key in out_edges) {
			if ( !out_edges.hasOwnProperty(key) ) {
				continue;
			}
			edge = out_edges[key];
			edge.getNodes().b.removeEdge(edge);
			delete this._dir_edges[edge.getID()];
			this._nr_dir_edges -=1;		
		}		
		node.clearOutEdges();
		this.updateGraphMode();
	}
	
	// Some atomicity / rollback feature would be nice here...
	deleteDirEdgesOf(node: $N.IBaseNode) : void {
		this.deleteInEdgesOf(node);
		this.deleteOutEdgesOf(node);
	}
	
	// Some atomicity / rollback feature would be nice here...
	deleteUndEdgesOf(node: $N.IBaseNode) : void {
		this.checkConnectedNodeOrThrow(node);
		var und_edges = node.undEdges();
		var key 	: string, 
				edge	: $E.IBaseEdge;
		
		for (key in und_edges) {
			if ( !und_edges.hasOwnProperty(key) ) {
				continue;
			}
			edge = und_edges[key];
			var conns = edge.getNodes();
			conns.a.removeEdge(edge);
			if ( conns.a !== conns.b ) {
				conns.b.removeEdge(edge);
			}			
			delete this._und_edges[edge.getID()];
			this._nr_und_edges -=1;		
		}	
		node.clearUndEdges();
		this.updateGraphMode();
	}
	
	// Some atomicity / rollback feature would be nice here...
	deleteAllEdgesOf(node: $N.IBaseNode) : void {
		this.deleteDirEdgesOf(node);
		this.deleteUndEdgesOf(node);
	}
	
	/**
	 * CAUTION - This function is linear in # directed edges
	 */
	getRandomDirEdge() : $E.IBaseEdge {
		return this.pickRandomProperty(this._dir_edges);
	}
	
	/**
	 * CAUTION - This function is linear in # undirected edges
	 */
	getRandomUndEdge() : $E.IBaseEdge {
		return this.pickRandomProperty(this._und_edges);
	}
	
	
	protected checkConnectedNodeOrThrow(node : $N.IBaseNode) {
		var node = this._nodes[node.getID()];
		if ( !node ) {
			throw new Error('Cowardly refusing to delete edges of un-added node.');
		}
	}
	
	protected updateGraphMode() {
		var nr_dir = this._nr_dir_edges,
				nr_und = this._nr_und_edges;
		
		if ( nr_dir && nr_und  ) {
			this._mode = GraphMode.MIXED;
		} 
		else if ( nr_dir ) {
			this._mode = GraphMode.DIRECTED;
		} 
		else if ( nr_und ) {
			this._mode = GraphMode.UNDIRECTED;
		} 
		else {
			this._mode = GraphMode.INIT;
		}
	}
	
	private pickRandomProperty(obj) {
    var key;
    var count = 0;
    for (var prop in obj) {
        if (obj.hasOwnProperty(prop) && Math.random() < 1/++count) {
           key = prop;
				}
		}
    return obj[key];
	}
	
}


export {DegreeDistribution, GraphMode, GraphStats, IGraph, BaseGraph};
