export interface RouteSchedule {
  from: string;
  to: string;
  times: string[];
}

export const routes: RouteSchedule[] = [
  { from: 'Loja', to: 'El Tambo', times: ['06:40', '12:10', '17:25', '18:20'] },
  { from: 'Loja', to: 'La Elvira', times: ['12:30', '16:25'] },
  {
    from: 'Loja', to: 'Vilcabamba',
    times: [
      '05:40', '05:50', '06:15', '06:25', '06:45', '07:15', '07:30', '07:45',
      '08:15', '08:30', '08:45', '09:15', '09:25', '09:45', '10:15', '10:25',
      '10:45', '11:15', '11:30', '11:45', '12:20', '12:45', '13:15', '13:30',
      '13:40', '13:45', '14:15', '14:30', '14:45', '15:15', '15:30', '15:45',
      '16:15', '16:45', '17:15', '17:45', '18:15', '18:25', '18:40', '18:55',
      '19:15', '19:30', '19:45', '20:15', '21:00', '21:15',
    ],
  },
  { from: 'Loja', to: 'Yangana', times: ['20:45'] },
  { from: 'Loja', to: 'Zahuayco', times: ['06:05', '08:55', '12:55', '18:05'] },
  { from: 'El Tambo', to: 'Loja', times: ['05:50', '06:50', '09:00', '16:00'] },
  { from: 'Zahuayco', to: 'Loja', times: ['05:50', '08:30', '12:45', '15:10'] },
  { from: 'La Elvira', to: 'Loja', times: ['07:00', '16:30'] },
  { from: 'Yangana', to: 'Loja', times: ['06:25'] },
  {
    from: 'Vilcabamba', to: 'Loja',
    times: [
      '05:10', '05:40', '06:10', '06:30', '06:45', '06:50', '06:55', '07:00',
      '07:20', '07:40', '07:50', '08:20', '08:30', '08:50', '09:00', '09:15',
      '09:30', '09:45', '10:10', '10:15', '10:20', '10:30', '10:45', '11:15',
      '11:25', '11:45', '12:15', '12:25', '12:45', '13:15', '13:30', '13:45',
      '14:15', '14:25', '14:45', '15:10', '15:15', '15:30', '15:40', '16:10',
      '16:20', '16:30', '16:50', '17:10', '17:15', '17:20', '17:30', '17:40',
      '18:00', '18:10', '18:30', '18:55', '19:25', '19:45', '20:15', '20:45',
      '21:30',
    ],
  },
];

export function getRouteLabel(from: string, to: string): string {
  return `${from} - ${to}`;
}

export function getAllRouteOptions(): string[] {
  return routes.map((r) => getRouteLabel(r.from, r.to));
}

export function getTimesForRoute(from: string, to: string): string[] {
  const route = routes.find((r) => r.from === from && r.to === to);
  return route ? route.times : [];
}
