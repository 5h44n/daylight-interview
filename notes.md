## getDeviceListUsages - Instantaneous device usage

GET `/AppAPI?apiMethod=getDeviceListUsages&deviceGids={deviceGid1}+{deviceGid2}&instant=2021-02-09T21:18:50.278474Z&scale=1S&energyUnit=KilowattHours`

Valid energy units: `[KilowattHours, Dollars, AmpHours, Trees, GallonsOfGas, MilesDriven, Carbon]`

Valid scales: `[1S, 1MIN, 1H, 1D, 1W, 1MON, 1Y]`

### Response

```json
{
  "deviceListUsages": {
    "instant": "2021-08-18T19:46:19Z",
    "scale": "1D",
    "devices": [
      {
        "deviceGid": 1234,
        "channelUsages": [
          {
            "name": "Main",
            "usage": 10.234881177404192,
            "deviceGid": 1234,
            "channelNum": "1,2,3",
            "percentage": 100.0,
            "nestedDevices": [
              {
                "deviceGid": 2345,
                "channelUsages": [
                  {
                    "name": "Main",
                    "usage": 2.904190340656776,
                    "deviceGid": 2345,
                    "channelNum": "1,2,3",
                    "percentage": 28.375418241966806,
                    "nestedDevices": []
                  }
                ]
              }
            ]
          },
          {
            "name": "Bar Area",
            "usage": 0.8640784244209527,
            "deviceGid": 1234,
            "channelNum": "1",
            "percentage": 8.442486135829311,
            "nestedDevices": []
          },
          {
            "name": "A/C",
            "usage": 0.0,
            "deviceGid": 1234,
            "channelNum": "2",
            "percentage": 0.0,
            "nestedDevices": []
          },
          {
            "name": "Balance",
            "usage": 1.595748729527017,
            "deviceGid": 1234,
            "channelNum": "Balance",
            "percentage": 15.59127753285492,
            "nestedDevices": []
          }
        ]
      }
    ],
    "energyUnit": "KilowattHours"
  }
}
```
