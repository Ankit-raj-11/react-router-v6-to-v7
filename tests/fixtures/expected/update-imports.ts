import { useNavigate, useLocation } from 'react-router';
import * as Router from 'react-router';
import RouterDefault from 'react-router';
import 'react-router';

// Edge Cases that MUST NOT be transformed (Zero False Positive Check)
// import { useNavigate } from 'react-router-dom';
const fakeImportString = "import * as Router from 'react-router-dom'";
const explanation = 'We are migrating away from react-router-dom';
