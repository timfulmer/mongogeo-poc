/**
 * Created by timfulmer on 10/25/14.
 */
describe('GeoData',function(){
    "use strict";

    var chai=require('chai'),
        GeoData=require('../lib/GeoData'),
        Promise=require("bluebird"),
        mongoose= require("mongoose"),
        initialized=false,
        testDriverType='driver-test',
        testRiderType='rider-test',
        testRouteType='route-test';
    chai.use(require('chai-as-promised'));

    beforeEach(function(done){
        if(!initialized){
            var options={
                driverType:testDriverType,
                routeType:testRouteType
            };
            GeoData.initialize(options).then(done);
            initialized=true;
        }else{
            done();
        }
    });
    afterEach(function (done) {
        GeoData.removeType(testDriverType).then(
            GeoData.removeType(testRiderType)
        ).then(
            GeoData.removeType(testRouteType)
        ).then(
            done
        );
    });
    after(function(){
        GeoData.close();
    });

    describe('#save',function(){
        it('should save a driver with max distance, long/lat points & timestamp',function(){
            var driver={
                type:testDriverType,
                maxDistance:10000,// meters,
                driverId:mongoose.Types.ObjectId(),
                geoJson:{
                    type:'Point',
                    coordinates:[-118.388253,34.014041]
                },
                datetime:new Date()
            };
            var savePromise= GeoData.save(driver);

            return Promise.all([
                chai.assert.isFulfilled(savePromise),

                chai.assert.eventually.property(savePromise, 'created'),
                chai.assert.eventually.property(savePromise, 'updated'),
                chai.assert.eventually.property(savePromise, 'type'),
                chai.assert.eventually.property(savePromise, 'maxDistance'),
                chai.assert.eventually.property(savePromise, 'driverId'),
                chai.assert.eventually.property(savePromise, 'geoJson'),
                chai.assert.eventually.deepProperty(savePromise, 'geoJson.type'),
                chai.assert.eventually.deepProperty(savePromise, 'geoJson.coordinates'),
                chai.assert.eventually.property(savePromise, 'datetime'),

                chai.assert.eventually.propertyVal(savePromise,'type',testDriverType),
                chai.assert.eventually.propertyVal(savePromise,'maxDistance',driver.maxDistance),
                chai.assert.eventually.propertyVal(savePromise,'driverId',driver.driverId),
                chai.assert.eventually.deepPropertyVal(savePromise,'geoJson.type','Point'),
                chai.assert.eventually.deepPropertyVal(savePromise,'geoJson.coordinates.length',2),
                chai.assert.eventually.propertyVal(savePromise,'datetime',driver.datetime)
            ]);
        });
        it('should save a rider with previous drivers, long/lat points & timestamp',function(){
            var rider={
                type:testRiderType,
                previousDrivers:[mongoose.Types.ObjectId(),mongoose.Types.ObjectId()],
                distance:100, // meters
                geoJson:{
                    type:'Point',
                    coordinates:[-118.388253,34.014041]
                },
                datetime:new Date()
            };
            var savePromise= GeoData.save(rider);

            return Promise.all([
                chai.assert.isFulfilled(savePromise),

                chai.assert.eventually.property(savePromise, 'created'),
                chai.assert.eventually.property(savePromise, 'updated'),
                chai.assert.eventually.property(savePromise, 'type'),
                chai.assert.eventually.property(savePromise, 'previousDrivers'),
                chai.assert.eventually.property(savePromise, 'geoJson'),
                chai.assert.eventually.deepProperty(savePromise, 'geoJson.type'),
                chai.assert.eventually.deepProperty(savePromise, 'geoJson.coordinates'),
                chai.assert.eventually.property(savePromise, 'datetime'),

                chai.assert.eventually.propertyVal(savePromise,'type',testRiderType),
                chai.assert.eventually.deepPropertyVal(savePromise,'previousDrivers.length',2),
                chai.assert.eventually.deepPropertyVal(savePromise,'geoJson.type','Point'),
                chai.assert.eventually.deepPropertyVal(savePromise,'geoJson.coordinates.length',2),
                chai.assert.eventually.propertyVal(savePromise,'datetime',rider.datetime)
            ]);
        });
        it('should save a route with long/lat points & timestamp, calculating a distance',function(){
            var route={
                type:testRouteType,
                driverId:mongoose.Types.ObjectId(),
                geoJson:{
                    type:'LineString',
                    coordinates:[[-118.396192,33.995969],[-118.388253,34.014041]]
                },
                datetime:new Date()
            };
            var savePromise= GeoData.save(route);

            return Promise.all([
                chai.assert.isFulfilled(savePromise),

                chai.assert.eventually.property(savePromise, 'created'),
                chai.assert.eventually.property(savePromise, 'updated'),
                chai.assert.eventually.property(savePromise, 'type'),
                chai.assert.eventually.property(savePromise, 'distance'),
                chai.assert.eventually.property(savePromise, 'driverId'),
                chai.assert.eventually.property(savePromise, 'geoJson'),
                chai.assert.eventually.deepProperty(savePromise, 'geoJson.type'),
                chai.assert.eventually.deepProperty(savePromise, 'geoJson.coordinates'),
                chai.assert.eventually.property(savePromise, 'datetime'),

                chai.assert.eventually.propertyVal(savePromise,'type',testRouteType),
                chai.assert.eventually.deepPropertyVal(savePromise,'distance',GeoData.distance(route.geoJson.coordinates)),
                chai.assert.eventually.deepPropertyVal(savePromise,'driverId',route.driverId),
                chai.assert.eventually.deepPropertyVal(savePromise,'geoJson.type','LineString'),
                chai.assert.eventually.deepPropertyVal(savePromise,'geoJson.coordinates.length',2),
                chai.assert.eventually.propertyVal(savePromise,'datetime',route.datetime)
            ]);
        });
    });

    describe('#findDrivers',function(){

        var preferredDriverId=mongoose.Types.ObjectId();

        beforeEach(function(done){
            var route={
                type:testRouteType,
                distance:10000, // meters
                driverId:mongoose.Types.ObjectId(),
                geoJson:{
                    type:'LineString',
                    coordinates:[[-118.396192,33.995969],[-118.388253,34.014041]]
                },
                datetime:new Date()
            };
            var driver1={
                type:testDriverType,
                maxDistance:10000,// meters
                driverId:preferredDriverId,
                geoJson:{
                    type:'Point',
                    coordinates:[-118.402637,33.994473]
                },
                datetime:new Date()
            };
            var driver2={
                type:testDriverType,
                maxDistance:1000,// meters
                driverId:mongoose.Types.ObjectId(),
                geoJson:{
                    type:'Point',
                    coordinates:[-118.402637,33.994473]
                },
                datetime:new Date()
            };
            GeoData.save(route).then(
                GeoData.save(driver1)
            ).then(
                GeoData.save(driver2)
            ).then(
                function(){
                    done();
                }
            );
        });
        it('should find drivers and routes within 2500 meters', function(){
            var rider={
                type:testRiderType,
                previousDrivers:[mongoose.Types.ObjectId(),mongoose.Types.ObjectId()],
                distance:100, // meters
                geoJson:{
                    type:'Point',
                    coordinates:[-118.388253,34.014041]
                },
                datetime:new Date()
            };
            var findPromise= GeoData.findDrivers(rider);

            return Promise.all([
                chai.assert.isFulfilled(findPromise),
                chai.assert.eventually.isArray(findPromise),
                chai.assert.eventually.property(findPromise,'length'),
                chai.assert.eventually.propertyVal(findPromise,'length',1)
            ])
        });
        it('should prefer drivers who have driven a rider before', function(){
            var rider={
                type:testRiderType,
                previousDrivers:[preferredDriverId,mongoose.Types.ObjectId()],
                distance:100, // meters
                geoJson:{
                    type:'Point',
                    coordinates:[-118.402637,33.994473]
                },
                datetime:new Date()
            };

            var findPromise= GeoData.findDrivers(rider).then(function(drivers){
                chai.assert(preferredDriverId.equals(drivers[0].driverId));
                return drivers;
            });

            return Promise.all([
                chai.assert.isFulfilled(findPromise),
                chai.assert.eventually.isArray(findPromise),
                chai.assert.eventually.property(findPromise,'length'),
                chai.assert.eventually.propertyVal(findPromise,'length',3)
            ])
        });
        it('should not suggest drivers outside their max distance preference', function(){
            var rider={
                type:testRiderType,
                previousDrivers:[mongoose.Types.ObjectId(),mongoose.Types.ObjectId()],
                distance:10000, // meters
                geoJson:{
                    type:'Point',
                    coordinates:[-118.402637,33.994473]
                },
                datetime:new Date()
            };

            var findPromise= GeoData.findDrivers(rider);

            return Promise.all([
                chai.assert.isFulfilled(findPromise),
                chai.assert.eventually.isArray(findPromise),
                chai.assert.eventually.property(findPromise,'length'),
                chai.assert.eventually.propertyVal(findPromise,'length',2)
            ])
        });
    });
});