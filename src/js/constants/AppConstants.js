var AppConstants = {
  YEAR: "2015",
  SITENAME: "Echo Sense",
  DOWNSAMPLES: [
  	{ value: 0, label: "None" },
  	{ value: 1, label: "Minute" },
    { value: 2, label: "Hour" }
  ],
  RULE_TRIGGERS: [
    { value: 1, label: "No Data" },
    { value: 2, label: "Floor" },
    { value: 3, label: "Ceiling" },
    { value: 4, label: "In Window" },
    { value: 5, label: "Out of Window" },
    { value: 6, label: "Delta Floor" },
    { value: 7, label: "Delta Ceiling" },
    { value: 8, label: "Any Data" },
    { value: 9, label: "Outside Geofence" }
  ],
  RULE_PLIMIT_TYPES: [
    { value: -2, label: "Disabled" },
    { value: 1, label: "Second", disabled: true },
    { value: 2, label: "Minute", disabled: true },
    { value: 3, label: "Hour" },
    { value: 4, label: "Day" },
    { value: 5, label: "Week" },
    { value: 6, label: "Month" }
  ],
  WEEKDAYS: [
    { value: 1, label: "Mon" },
    { value: 2, label: "Tue" },
    { value: 3, label: "Wed" },
    { value: 4, label: "Thu" },
    { value: 5, label: "Fri" },
    { value: 6, label: "Sat" },
    { value: 7, label: "Sun" }
  ],
  PAYMENT_STATUSES: [
    { value: 1, label: "Requested" },
    { value: 2, label: "Sent" },
    { value: 3, label: "Confirmed" },
    { value: 4, label: "Failed" }
  ],
  GAP_MINIMUM_SECS: 60,
  DATA_WINDOW_BUFFER_MS: 1000*30,  // 30 secs
  DOWNSAMPLE_MIN: 1,
  DOWNSAMPLE_HOUR: 2,
  USER_READ: 1,
  USER_RW: 2,
  USER_ACCOUNT_ADMIN: 3,
  USER_ADMIN: 4,
  USER_LABELS: [ "Read", "Read-Write", "Account Admin", "Admin" ],
  USER_STORAGE_KEY: 'echosenseUser',
  OBJECT_TIPS: {
    TARGET: "Targets are physical structures, objects, vehicles or locations that you want to track over time. Targets may have one or more associated sensors, which may measure different metrics related to the target.",

  }
};

module.exports = AppConstants;