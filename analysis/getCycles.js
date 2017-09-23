/**
 *  Grabs log data for a specified route, and processes entries by doing the
 *  following:
 *
 *  * Internally identifies buses based on their progression through a defined
 *  route sequence.
 *
 *  * Based on each identified bus, parse all the data as 'cycles', meaning
 *  an array of route data from the start to the end stop of a route. This
 *  will allow for more accurate calculation of ETAs and so forth.
 */
