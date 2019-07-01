import * as $G from '../core/Graph';
declare class ClosenessCentrality {
    constructor();
    getCentralityMapFW(graph: $G.IGraph): Array<Number>;
    getCentralityMap(graph: $G.IGraph): {
        [id: string]: number;
    };
}
export { ClosenessCentrality };
