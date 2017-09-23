/**
 *  Data cleaning / preparation module.
 *
 *  Creates what are known as 'cycles'. Cycles are sequences of Data Entries
 *  which start from the 'Gensis Stop' and end at the 'Terminal Stop' for a
 *  single bus on a given route.
 *
 *  These sequences, represented as arrays, will be used to help model the graphs
 *  which are used to calculate ETAs and so on.
 *
 *  Aaron Baw @ 2017
 */
