import React, { useState, useRef } from 'react';
import { Container, Typography, TextField, Button, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { CloudUpload, Download } from '@mui/icons-material';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import './App.css';

const App = () => {
  const [age, setAge] = useState('');
  const [filteredCitizens, setFilteredCitizens] = useState([]);
  const [citizens, setCitizens] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [fileUploaded, setFileUploaded] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];

    if (!file) {
      setErrorMessage('Please upload a file.');
      return;
    } else {
      setErrorMessage('');
    }

    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      handleExcelUpload(file);
    } else if (file.name.endsWith('.csv')) {
      handleCSVUpload(file);
    } else {
      setErrorMessage('Unsupported file format. Please upload Excel (.xlsx, .xls) or CSV (.csv) files.');
    }

    setFileUploaded(true);
  };

  const handleExcelUpload = (file) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      const headers = jsonData[0];
      const dataRows = jsonData.slice(1).map(row => {
        const rowData = {};
        headers.forEach((header, index) => {
          rowData[header] = row[index];
        });

        if (rowData["DOB"] || rowData["Date of Birth"]) {
          const dob = parseDate(rowData["DOB"] || rowData["Date of Birth"]);
          if (dob) {
            const age = calculateAge(dob);
            rowData["Age"] = age;
          }
        }

        return rowData;
      });

      setCitizens(dataRows);
      setErrorMessage('');
    };

    reader.readAsArrayBuffer(file);
  };

  const handleCSVUpload = (file) => {
    Papa.parse(file, {
      complete: (result) => {
        const jsonData = result.data.map(row => {
          if (row["DOB"] || row["Date of Birth"]) {
            const dob = parseDate(row["DOB"] || row["Date of Birth"]);
            if (dob) {
              const age = calculateAge(dob);
              row["Age"] = age;
            }
          }
          return row;
        });
        setCitizens(jsonData);
        setErrorMessage('');
      },
      header: true,
    });
  };

  const parseDate = (dobString) => {
    const parts = dobString.split(/[\.\-\/]/);
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    } else {
      return null;
    }
  };

  const calculateAge = (dob) => {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();

    // Check if the birthday for the current year has passed or not
    const birthdayThisYear = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    if (today < birthdayThisYear) {
      age--;
    }

    return age;
  };

  const handleFilter = () => {
    if (!age) {
      setErrorMessage('Please enter a minimum age value.');
      return;
    }

    if (!fileInputRef.current || !fileInputRef.current.files[0]) {
      setErrorMessage('Please upload a file.');
      return;
    }

    const filtered = citizens.filter(citizen => {
      if (citizen["Age"]) {
        return parseInt(citizen.Age) >= parseInt(age);
      } else if (citizen["DOB"] || citizen["Date of Birth"]) {
        const dob = parseDate(citizen["DOB"] || citizen["Date of Birth"]);
        const calculatedAge = calculateAge(dob);
        return calculatedAge >= parseInt(age);
      } else {
        return false;
      }
    });

    setFilteredCitizens(filtered);
    setShowAll(false);
    setErrorMessage('');

    if (filtered.length === 0) {
      setErrorMessage('No results found for the given age filter.');
    }
  };

  const downloadFilteredData = () => {
    const ws = XLSX.utils.json_to_sheet(filteredCitizens);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Filtered Data');
    XLSX.writeFile(wb, 'filtered_data.xlsx');
  };

  const clearAllData = () => {
    setAge('');
    setCitizens([]);
    setFilteredCitizens([]);
    setShowAll(false);
    setErrorMessage('');
    setFileUploaded(false); // Reset fileUploaded state to false
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Container maxWidth="sm" className="app">
      <header>
        <Typography variant="h3" component="h1">
          Senior Citizen Filter
        </Typography>
      </header>
      <main>
        <section className="description">
          <Typography variant="body1">
            Welcome to the Senior Citizen Filter project. Upload an Excel or CSV file containing a list of people with their ages or date of birth and then enter the minimum age to filter senior citizens.
          </Typography>
          <Typography variant="body2" color="error">
            Note: The file should contain a column named "Age" or "DOB" / "Date of Birth".
          </Typography>
        </section>
        <Card variant="outlined" className="filter-card">
          <CardContent>
            <Button
              variant="contained"
              component="label"
              startIcon={<CloudUpload />}
              style={{
                marginBottom: '20px',
                width: 'calc(50% - 5px)',
                backgroundColor: fileUploaded ? 'green' : 'blue', // Change color to blue if fileUploaded is false
                color: 'white'
              }}
            >
              {fileUploaded ? 'File Uploaded' : 'Upload File'}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                hidden
              />
            </Button>
            {errorMessage && (
              <Typography variant="body2" color="error" style={{ marginBottom: '10px' }}>
                {errorMessage}
              </Typography>
            )}
            <TextField
              fullWidth
              label="Enter minimum age"
              variant="outlined"
              value={age}
              onChange={(e) => {
                setAge(e.target.value);
                if (e.target.value) setErrorMessage('');
              }}
              type="number"
              margin="normal"
              InputProps={{ style: { color: '#333' } }}
              InputLabelProps={{ style: { color: '#555' } }}
              style={{ backgroundColor: '#f9f9f9', borderRadius: '5px' }}
            />
            <Button variant="contained" color="primary" fullWidth onClick={handleFilter} style={{ marginTop: '10px' }}>
              Filter
            </Button>
          </CardContent>
        </Card>
        <Typography variant="h5" component="h2" align="center" gutterBottom style={{ marginTop: '20px' }}>
          Filtered Senior Citizens
        </Typography>
        <TableContainer component={Paper} style={{ marginTop: '20px' }}>
          <Table>
            <TableHead>
              <TableRow>
                {filteredCitizens.length > 0 && Object.keys(filteredCitizens[0]).map((key) => (
                  <TableCell key={key}>{key}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCitizens.slice(0, showAll ? filteredCitizens.length : 8).map((citizen, index) => (
                <TableRow key={index}>
                  {Object.values(citizen).map((value, index) => (
                    <TableCell key={index}>{value}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {filteredCitizens.length > 8 && (
          <Button
            variant="outlined"
            color="primary"
            onClick={() => setShowAll(!showAll)}
            style={{ marginTop: '10px', marginBottom: '20px' }}
          >
            {showAll ? 'Show Less' : 'Show More'}
          </Button>
        )}
        {filteredCitizens.length > 0 && (
          <>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              className="download-button"
              startIcon={<Download />}
              onClick={downloadFilteredData}
              style={{ marginTop: '20px' }}
            >
              Download Filtered Data as Excel
            </Button>
            <Button
              variant="contained"
              style={{ backgroundColor: 'blue', color: 'white', marginTop: '10px', width: '50%' }}
              onClick={clearAllData}
            >
              Clear All
            </Button>
          </>
        )}
        <div style={{ marginBottom: '50px' }} />
      </main>
      <footer>
        <Typography variant="body2">
          &copy; {new Date().getFullYear()} Senior Citizen Filter 21CSR238
        </Typography>
      </footer>
    </Container>
  );
};

export default App;
