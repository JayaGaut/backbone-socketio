(function (global, Backbone, _) {
    "use strict";

    // initialization function
    // usage (with [Cocktail](https://github.com/onsi/cocktail):
    //     var socket = io.connect('http://localhost:3000'),
    //         backboneMixins = BackboneSocketio(socket),
    //         MyModel, MyCollection;
    //     
    //     MyModel = Backbone.Model.extend({ /* normal model init code here */ });
    //     Cocktail.mixin(MyModel, backboneMixins.mixins.model);
    //     
    //     MyCollection = Backbone.Collection.extend({ /* normal collection init code here */});
    //     Cocktail.mixin(MyCollection, backboneMixins.mixins.collection);
    //
    // usage (without Cocktail):
    //
    //     var socket = io.connect('http://localhost:3000'),
    //         backboneMixins = BackboneSocketio(socket),
    //         MyModel, MyCollection;
    //     
    //     MyModel = Backbone.Model.extend(_.extend(backboneMixins.mixins.model, {
    //         // normal model init code here
    //         initialize: function () {
    //             // if you need an initialize method make sure you call the parent's initialize function
    //             MyModel.__super__.initialize.call(this);
    //         }
    //     }));
    //     
    //     MyCollection = Backbone.Collection.extend(_.extend(backboneMixins.mixins.collection, {
    //         // normal collection init code here
    //         initialize: function () {
    //             // if you need an initialize method make sure you call the parent's initialize function
    //             MyCollection.__super__.initialize.call(this);
    //         }
    //     }));
    var BackboneSocketio = global.BackboneSocketio = function (ioSocket) {
        this.mixins = {
            collection: {
                initialize: function () {
                    if (!this instanceof Backbone.Collection) {
                        throw new Error("This object is not a Backbone.Collection");
                    }

                    var uniqueSocketId = _.uniqueId("socketEventCollection"),
                        emitData = { id: uniqueSocketId },
                        that = this;

                    // give the socket a unique ID so we can make sure events
                    // only are applied to the correct collection(s)
                    this.socketId = uniqueSocketId;

                    // publish `add` collection event to socket
                    this.on("add", function (model, changedCollection, options) {
                        if (!options.triggeredBySocket) {
                            ioSocket.emit("Backbone.Collection.add", _.extend(_.clone(emitData), {
                                model: model.toJSON(),
                                modelSocketId: model.socketId,
                                index: changedCollection.models.indexOf(model)
                            }));
                        }
                    });

                    // publish `remove` collection event to socket
                    this.on("remove", function (model, changedCollection, options) {
                        if (!options.triggeredBySocket) {
                            ioSocket.emit("Backbone.Collection.remove", _.extend(_.clone(emitData), {
                                modelSocketId: model.socketId
                            }));
                        }
                    });

                    // publish `sort` collection event to socket
                    this.on("sort", function (changedCollection, options) {
                        if (!options.triggeredBySocket) {
                            ioSocket.emit("Backbone.Collection.sort", _.extend(_.clone(emitData), {}));
                        }
                    });

                    // apply `add` socket event back to the appropriate collection
                    ioSocket.on("Backbone.Collection.add", function (data) {
                        if (data.id === that.socketId) {
                            that.add(data.model, {
                                at: data.index,
                                triggeredBySocket: true
                            });
                            that.at(data.index).socketId = data.modelSocketId;
                        }
                    });

                    // apply `remove` socket event back to the appropriate collection
                    ioSocket.on("Backbone.Collection.remove", function (data) {
                        if (data.id === that.socketId) {
                            var modelToRemove;

                            that.each(function (model) {
                                if (model.socketId === data.modelSocketId) {
                                    modelToRemove = model;
                                }
                            });
                            that.remove(modelToRemove, { triggeredBySocket: true });
                        }
                    });

                    // apply `sort` socket event back to the appropriate collection
                    ioSocket.on("Backbone.Collection.sort", function (data) {
                        console.log("socket broadcast: Backbone.Collection.sort", data);
                    });
                }
            },

            model: {
                initialize: function () {
                    if (!this instanceof Backbone.Model) {
                        throw new Error("This object is not a Backbone.Model");
                    }

                    var uniqueSocketId = _.uniqueId("socketEventModel"),
                        that = this;

                    // give the socket a unique ID so we can make sure events
                    // only are applied to the correct collection(s)
                    this.socketId = uniqueSocketId;

                    // publish model `change` events to socket
                    this.on("change", function (changedModel, options) {
                        if (!options.triggeredBySocket) {
                            ioSocket.emit("Backbone.Model.change", {
                                id: that.socketId,
                                updates: that.toJSON()
                            });
                        }
                    });

                    // apply socket events to appropriate model
                    ioSocket.on("Backbone.Model.change", function (data) {
                        if (data.id === that.socketId) {
                            that.set(data.updates, { triggeredBySocket: true });
                        }
                    });
                }
            }
        };
    };

    // AMD module definition setup
    if (typeof define === 'function' && define.amd) {
        define([], function () {
            return BackboneSocketio;
        });
    }

})(this, Backbone, _);
