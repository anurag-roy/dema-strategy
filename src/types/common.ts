export type Exchange = 'NSE' | 'NFO' | 'CDS' | 'MCX' | 'BSE';

export type ErrorResponse = {
  request_time: string;
  stat: 'Not_Ok';
  emsg: string;
};
