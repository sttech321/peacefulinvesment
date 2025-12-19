import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Export data to Excel file
 */
export const exportToExcel = (data: any[], filename: string, sheetName: string = 'Data') => {
  try {
    // Create a new workbook
    const workbook = XLSX.utils.book_new();
    
    // Convert data to worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // Generate Excel file
    XLSX.writeFile(workbook, `${filename}.xlsx`);
    
    return { success: true, message: 'Excel file exported successfully' };
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    return { success: false, message: 'Failed to export Excel file' };
  }
};

/**
 * Export data to PDF
 */
export const exportToPDF = async (data: any[], filename: string, title: string) => {
  try {
    // Create PDF document
    const pdf = new jsPDF();
    
    // Add title
    pdf.setFontSize(18);
    pdf.text(title, 20, 20);
    
    // Add timestamp
    pdf.setFontSize(10);
    pdf.text(`Generated on: ${new Date().toLocaleString()}`, 20, 30);
    
    // Add data
    pdf.setFontSize(12);
    let yPosition = 50;
    
    // Headers
    if (data.length > 0) {
      const headers = Object.keys(data[0]);
      headers.forEach((header, index) => {
        pdf.text(header, 20 + (index * 40), yPosition);
      });
      yPosition += 10;
    }
    
    // Data rows
    data.forEach((row, rowIndex) => {
      if (yPosition > 280) {
        pdf.addPage();
        yPosition = 20;
      }
      
      Object.values(row).forEach((value, index) => {
        const text = String(value || '');
        pdf.text(text.substring(0, 15), 20 + (index * 40), yPosition);
      });
      yPosition += 7;
    });
    
    // Save PDF
    pdf.save(`${filename}.pdf`);
    
    return { success: true, message: 'PDF file exported successfully' };
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    return { success: false, message: 'Failed to export PDF file' };
  }
};

/**
 * Export HTML element to PDF
 */
export const exportElementToPDF = async (elementId: string, filename: string) => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('Element not found');
    }
    
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const imgWidth = 210;
    const pageHeight = 295;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    
    let position = 0;
    
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    
    pdf.save(`${filename}.pdf`);
    
    return { success: true, message: 'PDF file exported successfully' };
  } catch (error) {
    console.error('Error exporting element to PDF:', error);
    return { success: false, message: 'Failed to export PDF file' };
  }
};

/**
 * Format data for export
 */
export const formatDataForExport = (data: any[], type: 'users' | 'accounts' | 'requests') => {
  switch (type) {
    case 'users':
      return data.map(user => ({
        'User ID': user.id,
        'Email': user.email,
        'Full Name': user.full_name,
        'Role': user.role,
        'Status': user.status,
        'Created At': new Date(user.created_at).toLocaleDateString(),
      }));
    
    case 'accounts':
      return data.map(account => ({
        'Account ID': account.id,
        'User ID': account.user_id,
        'Account Name': account.name,
        'MetaTrader ID': account.meta_trader_id,
        'Total P&L': account.total_pnl,
        'Status': account.status,
        'Expire Date': account.expire_date ? new Date(account.expire_date).toLocaleDateString() : 'N/A',
        'Created At': new Date(account.created_at).toLocaleDateString(),
      }));
    
    case 'requests':
      return data.map(request => ({
        'Request ID': request.id,
        'Full Name': request.full_name || request.name || 'N/A',
        'Email': request.email || 'N/A',
        'Phone': request.phone || 'N/A',
        'Contact Method': request.contact_method || 'N/A',
        'Subject': request.subject || 'N/A',
        'Message': request.message || 'N/A',
        'Priority': request.priority || 'N/A',
        'Status': request.status || 'N/A',
        'Admin Notes': request.admin_notes || 'N/A',
        'Resolved At': request.resolved_at ? new Date(request.resolved_at).toLocaleString() : 'N/A',
        'Created At': request.created_at ? new Date(request.created_at).toLocaleString() : 'N/A',
        'Updated At': request.updated_at ? new Date(request.updated_at).toLocaleString() : 'N/A',
      }));
    
    default:
      return data;
  }
};
