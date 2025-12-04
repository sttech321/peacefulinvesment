import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Filter, CalendarIcon, X, SortAsc, SortDesc } from "lucide-react";
import { format } from "date-fns";
import { Request } from "@/hooks/useRequests";
import { cn } from "@/lib/utils";

interface RequestFiltersProps {
  requests: Request[];
  onFilteredRequestsChange: (filteredRequests: Request[]) => void;
}

type SortField = 'created_at' | 'amount' | 'status' | 'type';
type SortDirection = 'asc' | 'desc';

const RequestFilters = ({ requests, onFilteredRequestsChange }: RequestFiltersProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [currencyFilter, setCurrencyFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [amountMin, setAmountMin] = useState<string>("");
  const [amountMax, setAmountMax] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Get unique values for filter options
  const filterOptions = useMemo(() => {
    const statuses = [...new Set(requests.map(r => r.status))];
    const types = [...new Set(requests.map(r => r.type))];
    const paymentMethods = [...new Set(requests.map(r => r.payment_method))];
    const currencies = [...new Set(requests.map(r => r.currency))];

    return {
      statuses: statuses.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) })),
      types: types.map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) })),
      paymentMethods: paymentMethods.sort(),
      currencies: currencies.sort(),
    };
  }, [requests]);

  // Apply filters and sorting
  const filteredRequests = useMemo(() => {
    let filtered = requests.filter(request => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch = 
          request.id.toLowerCase().includes(search) ||
          request.payment_method.toLowerCase().includes(search) ||
          request.description?.toLowerCase().includes(search) ||
          request.admin_notes?.toLowerCase().includes(search);
        
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== "all" && request.status !== statusFilter) return false;

      // Type filter
      if (typeFilter !== "all" && request.type !== typeFilter) return false;

      // Payment method filter
      if (paymentMethodFilter !== "all" && request.payment_method !== paymentMethodFilter) return false;

      // Currency filter
      if (currencyFilter !== "all" && request.currency !== currencyFilter) return false;

      // Date range filter
      if (dateFrom || dateTo) {
        const requestDate = new Date(request.created_at);
        if (dateFrom && requestDate < dateFrom) return false;
        if (dateTo && requestDate > dateTo) return false;
      }

      // Amount range filter
      if (amountMin && request.amount < parseFloat(amountMin)) return false;
      if (amountMax && request.amount > parseFloat(amountMax)) return false;

      return true;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortField) {
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        default:
          aValue = a.created_at;
          bValue = b.created_at;
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [
    requests, searchTerm, statusFilter, typeFilter, paymentMethodFilter, 
    currencyFilter, dateFrom, dateTo, amountMin, amountMax, sortField, sortDirection
  ]);

  // Update parent component when filtered requests change
  useMemo(() => {
    onFilteredRequestsChange(filteredRequests);
  }, [filteredRequests, onFilteredRequestsChange]);

  const clearAllFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setTypeFilter("all");
    setPaymentMethodFilter("all");
    setCurrencyFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    setAmountMin("");
    setAmountMax("");
    setSortField('created_at');
    setSortDirection('desc');
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const hasActiveFilters = searchTerm || statusFilter !== "all" || typeFilter !== "all" || 
    paymentMethodFilter !== "all" || currencyFilter !== "all" || dateFrom || dateTo || 
    amountMin || amountMax;

  return (
    <div className="bg-gradient-pink-to-yellow hover:glow-primary relative rounded-sm p-[2px]">
      <div className="space-y-4 p-4 rounded-sm bg-black">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-white" />
            <span className="font-medium text-white">Filters & Search</span>
            <Badge variant="secondary" className="">
              {filteredRequests.length} of {requests.length} requests
            </Badge>
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>

        {/* Search and Sort Row */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent resize-none"
            />
          </div>

          <Select value={sortField} onValueChange={(value) => setSortField(value as SortField)}>
            <SelectTrigger className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}>
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className='border-secondary-foreground bg-black/90 text-white'>
              <SelectItem value="created_at">Date Created</SelectItem>
              <SelectItem value="amount">Amount</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="type">Type</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => toggleSort(sortField)}
            className="justify-start"
          >
            {sortDirection === 'asc' ? (
              <SortAsc className="h-4 w-4 mr-2" />
            ) : (
              <SortDesc className="h-4 w-4 mr-2" />
            )}
            {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
          </Button>
        </div>

        {/* Filter Row */}
        <div className="grid gap-4 md:grid-cols-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent className='border-secondary-foreground bg-black/90 text-white'>
              <SelectItem value="all">All Statuses</SelectItem>
              {filterOptions.statuses.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent className='border-secondary-foreground bg-black/90 text-white'>
              <SelectItem value="all">All Types</SelectItem>
              {filterOptions.types.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
            <SelectTrigger className="focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent">
              <SelectValue placeholder="All Payment Methods" />
            </SelectTrigger>
            <SelectContent className='border-secondary-foreground bg-black/90 text-white'>
              <SelectItem value="all">All Payment Methods</SelectItem>
              {filterOptions.paymentMethods.map((method) => (
                <SelectItem key={method} value={method}>
                  {method}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
            <SelectTrigger className="focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent">
              <SelectValue placeholder="All Currencies" />
            </SelectTrigger>
            <SelectContent className='border-secondary-foreground bg-black/90 text-white'>
              <SelectItem value="all">All Currencies</SelectItem>
              {filterOptions.currencies.map((currency) => (
                <SelectItem key={currency} value={currency}>
                  {currency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Amount and Date Range Row */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">Min Amount</label>
            <Input
              type="number"
              className="focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent"
              placeholder="0.00"
              value={amountMin}
              onChange={(e) => setAmountMin(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white">Max Amount</label>
            <Input
              type="number"
              className="focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent"
              placeholder="0.00"
              value={amountMax}
              onChange={(e) => setAmountMax(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white">From Date</label>
            <Popover>
              <PopoverTrigger asChild className="focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent">
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateFrom && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 border-secondary-foreground bg-black/90 text-white">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white">To Date</label>
            <Popover>
              <PopoverTrigger asChild className="focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent">
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateTo && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 border-secondary-foreground bg-black/90 text-white">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </div>  
  );
};

export default RequestFilters;