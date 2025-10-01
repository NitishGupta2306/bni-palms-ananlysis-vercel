import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TYFCBData } from '../types/matrix.types';

interface TYFCBReportProps {
  tyfcbData: TYFCBData | null;
}

export const TYFCBReport: React.FC<TYFCBReportProps> = ({ tyfcbData }) => {
  if (!tyfcbData) {
    return (
      <Alert>
        <AlertDescription>
          No TYFCB data available for this report
        </AlertDescription>
      </Alert>
    );
  }

  const { inside, outside } = tyfcbData;
  const totalAmount = inside.total_amount + outside.total_amount;
  const totalTransactions = inside.count + outside.count;

  // Get top performers for inside and outside
  const topInsideMembers = Object.entries(inside.by_member)
    .filter(([_, amount]) => amount > 0)
    .sort(([_a, amountA], [_b, amountB]) => amountB - amountA)
    .slice(0, 10);

  const topOutsideMembers = Object.entries(outside.by_member)
    .filter(([_, amount]) => amount > 0)
    .sort(([_a, amountA], [_b, amountB]) => amountB - amountA)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Thank You For Closed Business (TYFCB) report showing business closed through referrals
      </p>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold text-primary mb-2">
              Total TYFCB
            </h3>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              AED {totalAmount.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {totalTransactions} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold text-primary mb-2">
              Inside Chapter
            </h3>
            <p className="text-3xl font-bold">
              AED {inside.total_amount.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {inside.count} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold text-primary mb-2">
              Outside Chapter
            </h3>
            <p className="text-3xl font-bold">
              AED {outside.total_amount.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {outside.count} transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inside Chapter Top Performers */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold text-primary mb-4">
              Top Inside Chapter TYFCB
            </h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Member</TableHead>
                    <TableHead className="text-right font-semibold">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topInsideMembers.map(([member, amount]) => (
                    <TableRow key={member} className="hover:bg-muted/50">
                      <TableCell>{member}</TableCell>
                      <TableCell className="text-right font-medium text-green-600 dark:text-green-400">
                        AED {amount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {topInsideMembers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        No inside chapter TYFCB data
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Outside Chapter Top Performers */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold text-primary mb-4">
              Top Outside Chapter TYFCB
            </h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Member</TableHead>
                    <TableHead className="text-right font-semibold">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topOutsideMembers.map(([member, amount]) => (
                    <TableRow key={member} className="hover:bg-muted/50">
                      <TableCell>{member}</TableCell>
                      <TableCell className="text-right font-medium text-green-600 dark:text-green-400">
                        AED {amount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {topOutsideMembers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        No outside chapter TYFCB data
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
