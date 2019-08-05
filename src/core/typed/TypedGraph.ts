import {BaseEdge, IBaseEdge} from '../base/BaseEdge';
import { ITypedNode } from './TypedNode';
import { BaseGraph, GraphMode, GraphStats } from '../base/BaseGraph';

import { Logger } from '../../utils/Logger';
import {ITypedEdge} from "./TypedEdge";
const logger = new Logger();

export const GENERIC_TYPE = "GENERIC";

export type TypedNodes = Map<string, Map<string, ITypedNode>>;
export type TypedEdges = Map<string, Map<string, IBaseEdge>>;

export interface TypedGraphStats extends GraphStats {
	node_types: string[];
	edge_types: string[];
	typed_nodes: { [key: string]: number };
	typed_edges: { [key: string]: number };
}


/**
 * @description in the typedGraph setting, we use the label as type
 * @todo introduce extra type property
 * @description coding standard: following Neo4j / Cypher standard,
 * node types should be in capital letters & edge types expressive
 * two-pieces separated by underscore (except 'GENERIC')
 * @todo enforce uppercase?
 * @description we could couple edge type & direction in order to
 * make the system more stringent, but this would result in a more
 * complex setup with the possibility of too many Errors thrown.
 * @solution for now, leave the type / direction combination to the
 * programmer & just assume internal consistency
 * @todo how to handle traversal when direction given goes against
 *       direction information in the edge object ?
 * @todo just don't specify direction in traversal / expand and only
 *       follow the direction specified in edge !?
 * @todo in the last case, how to handle undirected edges ?
 * @todo allow 'GENERIC' edge types ?
 */
export class TypedGraph extends BaseGraph {

	/**
	 * We don't need an extra array of registered types, since an
	 * acceptable recommendation graph will only contain a few single
	 * up to a few dozen different types, which are quickly obtained
	 * via Object.keys()
	 */
	protected _typedNodes: TypedNodes = new Map();
	protected _typedEdges: TypedEdges = new Map();


	constructor(public _label: string) {
		super(_label);
		this._typedNodes.set(GENERIC_TYPE, new Map());
		this._typedEdges.set(GENERIC_TYPE, new Map());
	}


	nodeTypes(): string[] {
		return Array.from(this._typedNodes.keys());
	}


	edgeTypes(): string[] {
		return Array.from(this._typedEdges.keys());
	}


	nrTypedNodes(type: string): number | null {
		type = type.toUpperCase();
		return this._typedNodes.get(type) ? this._typedNodes.get(type).size : null;
	}


	nrTypedEdges(type: string): number | null {
		type = type.toUpperCase();
		return this._typedEdges.get(type) ? this._typedEdges.get(type).size : null;
	}


	addNode(node: ITypedNode): ITypedNode {
		if (!super.addNode(node)) {
			return null;
		}
		// logger.log(JSON.stringify(node));

		const id = node.getID(),
			type = node.type ? node.type.toUpperCase() : null;

		/**
		 *  Untyped nodes will be treated as `generic` type
		 */
		if ( !type ) {
			// logger.log(`Received node type: ${type}`);

			this._typedNodes.get(GENERIC_TYPE).set(id, node);
		} else {
			if ( !this._typedNodes.get(type) ) {
				this._typedNodes.set(type, new Map());
			}
			this._typedNodes.get(type).set(id, node);
		}
		return node;
	}


	deleteNode(node: ITypedNode): void {
		const id = node.getID(),
			type = node.type ? node.type.toUpperCase() : GENERIC_TYPE;

		if (!this._typedNodes.get(type)) {
			throw Error('Node type does not exist on this TypedGraph.');
		}
		const removeNode = this._typedNodes.get(type).get(id);
		if (!removeNode) {
			throw Error('This particular node is nowhere to be found in its typed set.')
		}
		this._typedNodes.get(type).delete(id);
		if (this.nrTypedNodes(type) === 0) {
			this._typedNodes.delete(type);
		}

		super.deleteNode(node);
	}


	addEdge(edge: IBaseEdge | ITypedEdge): IBaseEdge {
		if (!super.addEdge(edge)) {
			return undefined;
		}

		const id = edge.getID();
		let type = undefined;
		if ( BaseEdge.isTyped(edge) ) {
			edge.type ? edge.type.toUpperCase() : GENERIC_TYPE;
		}

		/**
		 *  Same procedure as every node...
		 */
		if (id === type) {
			this._typedEdges.get(GENERIC_TYPE).set(id, edge);
		} else {
			if (!this._typedEdges.get(type)) {
				this._typedEdges.set(type, new Map());
			}
			this._typedEdges.get(type).set(id, edge);
		}
		return edge;
	}


	deleteEdge(edge: ITypedEdge): void {
		const id = edge.getID(),
			type = edge.type === id ? GENERIC_TYPE : edge.type.toUpperCase();

		if (!this._typedEdges.get(type)) {
			throw Error('Edge type does not exist on this TypedGraph.');
		}
		const removeEdge = this._typedEdges.get(type).get(id);
		if (!removeEdge) {
			throw Error('This particular edge is nowhere to be found in its typed set.')
		}
		this._typedEdges.get(type).delete(id);
		if (this.nrTypedEdges(type) === 0) {
			this._typedEdges.delete(type);
		}

		super.deleteEdge(edge);
	}


	getStats(): TypedGraphStats {
		let typed_nodes = {},
			typed_edges = {};
		this._typedNodes.forEach((k, v) => typed_nodes[v] = k.size);
		this._typedEdges.forEach((k, v) => typed_edges[v] = k.size);
		return {
			...super.getStats(),
			node_types: this.nodeTypes(),
			edge_types: this.edgeTypes(),
			typed_nodes,
			typed_edges
		};
	}

}
