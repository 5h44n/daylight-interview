export interface EmporiaTokens {
  idToken: string;
  refreshToken: string;
  idTokenExpiresAt?: Date;
}

export interface DeviceUsage {
  name: string;
  usage: number;
  deviceGid: number;
  channelNum: string;
  percentage: number;
  nestedDevices: DeviceUsage[];
}

export interface DeviceListUsageResponse {
  deviceListUsages: {
    instant: string;
    scale: string;
    devices: {
      deviceGid: number;
      channelUsages: DeviceUsage[];
    }[];
    energyUnit: string;
  };
}

export interface EmporiaCustomer {
  customerGid: number;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
}

export interface EmporiaDevice {
  deviceGid: number;
  manufacturerDeviceId: string;
  model: string;
  firmware: string;
  locationProperties: EmporiaLocationProperties;
  outlet: EmporiaOutlet | null;
  devices: EmporiaDevice[];
  channels: EmporiaChannel[];
}

export interface EmporiaLocationProperties {
  deviceGid: number;
  deviceName: string;
  zipCode: string;
  timeZone: string;
  billingCycleStartDay: number;
  usageCentPerKwHour: number;
  peakDemandDollarPerKw: number;
  locationInformation: EmporiaLocationInformation | null;
  latitudeLongitude: string | null;
}

export interface EmporiaLocationInformation {
  airConditioning: string;
  heatSource: string;
  locationSqFt: string;
  numElectricCars: string;
  locationType: string;
  numPeople: string;
  swimmingPool: string;
  hotTub: string;
}

export interface EmporiaOutlet {
  deviceGid: number;
  outletOn: boolean;
  parentDeviceGid: number;
  parentChannelNum: string;
  schedules: any[]; // Define a specific type if available
}

export interface EmporiaChannel {
  deviceGid: number;
  name: string | null;
  channelNum: string;
  channelMultiplier: number;
  channelTypeGid: number | null;
}

export interface EmporiaCustomerDevices {
  customerGid: number;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  devices: EmporiaDevice[];
}
