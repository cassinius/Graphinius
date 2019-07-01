import * as fs from 'fs';
import * as $N from '../../../src/core/Nodes';
import * as $E from '../../../src/core/Edges';
import * as $G from '../../../src/core/Graph';
import { JSONInput, IJSONInConfig } from '../../../src/io/input/JSONInput';
import { JSONOutput} from '../../../src/io/output/JSONOutput';

let jsonIn: JSONInput,
    jsonOut: JSONOutput,
    graph: $G.IGraph,
    resultString: string,
    search_graph_in = "./test/test_data/search_graph.json",
    search_graph_out = "./test/test_data/output/search_graph_out.json";

let std_json_in_config: IJSONInConfig = {
  explicit_direction: true,
  directed: false,
  weighted: true
}


describe('GRAPH JSON OUTPUT TESTS - ', () => {

  beforeEach(() => {
    graph = new $G.BaseGraph("Output Test graph");
  });


  describe('Output toy JSON structs', () => {

    /**
     * Shall a node without edges still have an 
     * empty edges array and an empty features object?
     */
    test('Should correctly output a graph of just one node', () => {
      graph.addNodeByID("A");
      jsonOut = new JSONOutput();
      resultString = jsonOut.writeToJSONString( graph );

      let JSONControlStruct = {
        name: "Output Test graph",
        nodes: 1,
        dir_edges: 0,
        und_edges: 0,
        data: {
          A: {
            edges: [],
            features: {}
          }
        }
      };
      let JSONControlString = JSON.stringify( JSONControlStruct );
      expect(resultString).toBe(JSONControlString);
    });


    test(
      'Should correctly output a graph of two nodes and an UNdirected edge',
      () => {
        let n_a = graph.addNodeByID("A");
        let n_b = graph.addNodeByID("B");
        graph.addEdgeByID("Test edge", n_a, n_b);
        jsonOut = new JSONOutput();
        resultString = jsonOut.writeToJSONString( graph );

        let JSONControlStruct = {
          name: "Output Test graph",
          nodes: 2,
          dir_edges: 0,
          und_edges: 1,
          data: {
            A: {
              edges: [
                {
                  to: "B",
                  directed: false,
                  weight: undefined
                }
              ],
              features: { }
            },
            B: {
              edges: [
                {
                  to: "A",
                  directed: false,
                  weight: undefined
                }
              ],
              features: { }
            }
          }
        };
        let JSONControlString = JSON.stringify( JSONControlStruct );
        expect(resultString).toBe(JSONControlString);
      }
    );


    test(
      'Should correctly output a graph of two nodes and a directed edge',
      () => {
        let n_a = graph.addNodeByID("A");
        let n_b = graph.addNodeByID("B");
        graph.addEdgeByID("Single directed edge", n_b, n_a, {directed: true});
        jsonOut = new JSONOutput();
        resultString = jsonOut.writeToJSONString( graph );

        let JSONControlStruct = {
          name: "Output Test graph",
          nodes: 2,
          dir_edges: 1,
          und_edges: 0,
          data: {
            A: {
              edges: [ ],
              features: { }
            },
            B: {
              edges: [
                {
                  to: "A",
                  directed: true,
                  weight: undefined
                }
              ],
              features: { }
            }
          }
        };
        let JSONControlString = JSON.stringify( JSONControlStruct );
        expect(resultString).toBe(JSONControlString);
      }
    );


    test(
      'Should correctly output a graph of two nodes and a directed edge with weight',
      () => {
        let n_a = graph.addNodeByID("A");
        let n_b = graph.addNodeByID("B");
        graph.addEdgeByID("Single directed edge", n_b, n_a, {
          directed: true,
          weighted: true,
          weight: 5
        });
        jsonOut = new JSONOutput();
        resultString = jsonOut.writeToJSONString( graph );

        let JSONControlStruct = {
          name: "Output Test graph",
          nodes: 2,
          dir_edges: 1,
          und_edges: 0,
          data: {
            A: {
              edges: [ ],
              features: { }
            },
            B: {
              edges: [
                {
                  to: "A",
                  directed: true,
                  weight: 5
                }
              ],
              features: { }
            }
          }
        };
        let JSONControlString = JSON.stringify( JSONControlStruct );
        expect(resultString).toBe(JSONControlString);
      }
    );


    test('Should correctly output a graph of one node and its features', () => {
      let n_a = graph.addNodeByID("A");
      let features = {
        coords: {
          x: 1,
          y: 1,
          z: 1
        }
      }
      n_a.setFeatures( features );
      jsonOut = new JSONOutput();
      resultString = jsonOut.writeToJSONString( graph );

      let JSONControlStruct = {
        name: "Output Test graph",
        nodes: 1,
        dir_edges: 0,
        und_edges: 0,
        data: {
          A: {
            edges: [ ],
            features: {
              coords: {
                x: 1,
                y: 1,
                z: 1
              }
            },
            coords: {
              x: 1,
              y: 1,
              z: 1
            }
          }
        }
      };
      let JSONControlString = JSON.stringify( JSONControlStruct );
      expect(resultString).toBe(JSONControlString);
    });

  });


  /**
   * Only works with files specifically written to resemble
   * the internal order of nodes after creation
   * 
   * e.g. nodes A -> B -> C would internally become
   * A -> C -> B if an edge A -> C existed in file...
   */
  describe('Output small JSON structs from file', () => {

    test('Should correctly output search graph after reading it from file', () => {
      jsonIn = new JSONInput(std_json_in_config);
      let in_graph = fs.readFileSync( search_graph_in ).toString().replace(/\s/g, '');

      graph = jsonIn.readFromJSONFile( search_graph_in );
      let JSONControlString = jsonOut.writeToJSONString( graph );

      expect( JSONControlString ).toBe(in_graph);
    });

  });


  describe('Writing small JSON structs from file', () => {

    afterEach(() => {
      fs.unlinkSync( search_graph_out );
      expect(fs.existsSync(search_graph_out)).toBe(false);
    })

    test(
      'Should correctly output search graph file after reading from file',
      () => {
        jsonIn = new JSONInput(std_json_in_config);
        graph = jsonIn.readFromJSONFile( search_graph_in );
        
        jsonOut.writeToJSONFile( search_graph_out, graph );
        expect( fs.existsSync( search_graph_out ) ).toBe(true);

        let graph2 = jsonIn.readFromJSONFile( search_graph_out );
        expect( graph ).toEqual(graph2);

        graph.addNodeByID('superfluous');
        expect( graph ).not.toEqual(graph2);
      }
    );

  });


  describe('correctly handle extreme edge weight cases', () => {
    let JSONControlStruct = {},
        n_a : $N.IBaseNode,
        n_b : $N.IBaseNode;

    beforeEach(() => {
      graph = new $G.BaseGraph('Output Test graph');
      n_a = graph.addNodeByID("A");
      n_b = graph.addNodeByID("B");

      JSONControlStruct = {
        name: "Output Test graph",
        nodes: 2,
        dir_edges: 1,
        und_edges: 0,
        data: {
          A: {
            edges: [ ],
            features: { }
          },
          B: {
            edges: [
              {
                to: "A",
                directed: true,
                weight: undefined
              }
            ],
            features: { }
          }
        }
      };
    });
    

    test('should encode Positive Infinity as string "infinity"', () => {
      graph.addEdgeByID("Single directed edge", n_b, n_a, {
        directed: true,
        weighted: true,
        weight: Number.POSITIVE_INFINITY
      });
      jsonOut = new JSONOutput();
      resultString = jsonOut.writeToJSONString( graph );
      JSONControlStruct['data']['B']['edges'][0]['weight'] = 'Infinity';
      let JSONControlString = JSON.stringify( JSONControlStruct );
      expect(resultString).toBe(JSONControlString);      
    });


    test('should encode Negative Infinity as string "-infinity"', () => {  
      graph.addEdgeByID("Single directed edge", n_b, n_a, {
        directed: true,
        weighted: true,
        weight: Number.NEGATIVE_INFINITY
      });
      jsonOut = new JSONOutput();
      resultString = jsonOut.writeToJSONString( graph );
      JSONControlStruct['data']['B']['edges'][0]['weight'] = '-Infinity';
      let JSONControlString = JSON.stringify( JSONControlStruct );
      expect(resultString).toBe(JSONControlString);      
    });


    test('should encode Max Value as string "max"', () => {
      graph.addEdgeByID("Single directed edge", n_b, n_a, {
        directed: true,
        weighted: true,
        weight: Number.MAX_VALUE
      });
      jsonOut = new JSONOutput();
      resultString = jsonOut.writeToJSONString( graph );
      JSONControlStruct['data']['B']['edges'][0]['weight'] = 'MAX';
      let JSONControlString = JSON.stringify( JSONControlStruct );
      expect(resultString).toBe(JSONControlString);      
    });


    test('should encode Min Value as string "min"', () => {
      graph.addEdgeByID("Single directed edge", n_b, n_a, {
        directed: true,
        weighted: true,
        weight: Number.MIN_VALUE
      });
      jsonOut = new JSONOutput();
      resultString = jsonOut.writeToJSONString( graph );
      JSONControlStruct['data']['B']['edges'][0]['weight'] = 'MIN';
      let JSONControlString = JSON.stringify( JSONControlStruct );
      expect(resultString).toBe(JSONControlString);      
    });

  });

});
