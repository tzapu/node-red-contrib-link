/**
 * Copyright 2013,2015 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

module.exports = function(RED) {
  "use strict";
  var inspect = require("util").inspect;

  // A node red node that sets up a local websocket server
  function LinkProxyNode(n) {
    // Create a RED node
    RED.nodes.createNode(this, n);
    var node = this;

    node._inputNodes = []; // collection of nodes that want to receive events

    node.setMaxListeners(100);

    node.on("close", function() {
      // Workaround https://github.com/einaros/ws/pull/253
      // Remove listeners from RED.server
      console.log('close proxy');
    });

    console.log('new proxy');

  }

  RED.nodes.registerType("link-proxy", LinkProxyNode);

  LinkProxyNode.prototype.registerInputNode = function( /*Node*/ handler) {
    console.log('register input');
    this._inputNodes.push(handler);
  }

  LinkProxyNode.prototype.removeInputNode = function( /*Node*/ handler) {
    console.log('remove input');
    this._inputNodes.forEach(function(node, i, inputNodes) {
      if (node === handler) {
        inputNodes.splice(i, 1);
      }
    });
  }

  LinkProxyNode.prototype.forwardMessage = function(topic, msg) {
    console.log('sending', topic, msg);
    this._inputNodes.forEach(function(node, i, inputNodes) {
      if (node.topic == topic) {
        node.send(msg);
      }
    });
  }


  function LinkInNode(n) {
    RED.nodes.createNode(this, n);

    var node = this;
    this.proxy = RED.nodes.getNode(n.proxy);

    this.topic = n.topic;
    console.log('new link in', this.topic);

    if (this.proxy) {
      this.proxy.registerInputNode(this);
    } else {
      this.error(RED._("link-proxy.errors.missing-conf"));
    }

    this.on('close', function() {
      node.proxy.removeInputNode(node);
    });

  }
  RED.nodes.registerType("link-in", LinkInNode);


  function LinkOutNode(n) {
    RED.nodes.createNode(this, n);
    var node = this;
    //this.proxy = n.proxy;
    this.topic = n.topic;

    this.proxy = RED.nodes.getNode(n.proxy);

    if (!this.proxy) {
      this.error(RED._("links-proxy.errors.missing-conf"));
    }
    this.on("input", function(msg) {
      console.log('sending msg', msg);
      if (msg) {
        //sending message to listening nodes
        node.proxy.forwardMessage(node.topic, msg);
      }


    });
  }
  RED.nodes.registerType("link-out", LinkOutNode);

}
