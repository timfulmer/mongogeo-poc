/**
 * Created by timfulmer on 10/25/14.
 */
var Promise = require("bluebird"),
    mongoose= require("mongoose"),
    options={},
    GeoData={},
    connection;

function distance(endPoints) {
    var R = 6371,
        lon1=endPoints[0][0],
        lat1=endPoints[0][1],
        lon2=endPoints[1][0],
        lat2=endPoints[1][1];
    var a =
        0.5 - Math.cos((lat2 - lat1) * Math.PI / 180)/2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        (1 - Math.cos((lon2 - lon1) * Math.PI / 180))/2;

    return R * 2 * Math.asin(Math.sqrt(a));
}

function initialize(opts){
    "use strict";

    options.driverType=opts.driverType || 'driver';
    options.routeType=opts.routeType || 'route';

    function initializePromise(resolve,reject){
        mongoose.connect('mongodb://localhost/test');
        connection=mongoose.connection;
        connection.on('error', reject);
        function connectionOpen() {
            var schema = mongoose.Schema({
                created:{type:Date,default:Date.now},
                updated:{type:Date,default:Date.now},
                type:String,
                maxDistance:Number,
                previousDrivers:[mongoose.Schema.Types.ObjectId],
                distance:Number,
                driverId:mongoose.Schema.Types.ObjectId,
                geoJson:{
                    type:{type:String},
                    coordinates:{type:[]}
                },
                datetime:{type:Date,default:Date.now}
            });
            schema.index({'geoJson':'2dsphere'});
            GeoData=mongoose.model('GeoData',schema);
            resolve();
        }
        connection.once('open', connectionOpen);
    }
    return new Promise(initializePromise);
}

function save(properties){
    "use strict";
    function savePromise(resolve,reject){
        if(properties.geoJson && properties.geoJson.type==='LineString'){
            properties.distance=distance(properties.geoJson.coordinates);
        }
        var geoData=new GeoData(properties);
        geoData.save(function geoDataSaved(err,geoData){
            if(err) return reject(err);
            resolve(geoData);
        });
    }
    return new Promise(savePromise);
}

function findDrivers(rider){
    "use strict";
    var previousDriverStrings=[];
    rider.previousDrivers.forEach(function(previousDriver){
        previousDriverStrings.push(previousDriver.toString());
    });
    function findDriversPromise(resolve,reject){
        var query={
            geoJson:{$near:{$geometry:rider.geoJson,$maxDistance:2500}},
            type:{$in:[options.driverType,options.routeType]},
            $or:[{maxDistance:{$gte:rider.distance}},{maxDistance:{$exists:false}}]
        };
        GeoData.find(query,function queryResults(err,docs){
            if(err) reject(err);
            docs.sort(function(a,b){
                return previousDriverStrings.indexOf(b.driverId.toString())>-1 ? 1 : 0;
            });
            resolve(docs);
        })
    }
    return new Promise(findDriversPromise);
}

function removeType(type){
    "use strict";
    function removeTypePromise(resolve,reject){
        GeoData.remove({type:type},function(err){
            if(err) return reject(err);
            resolve();
        })
    }
    return new Promise(removeTypePromise);
}

function close(){
    "use strict";
    connection.close();
}

module.exports=exports={
    initialize:initialize,
    save:save,
    findDrivers:findDrivers,
    removeType:removeType,
    close:close,
    distance:distance
};