import dynamic from 'next/dynamic';
import { Link } from 'react-router-dom';
import { IconLogo } from '../components/Logo';
import { Home as HomeIcon, Store as StoreIcon } from '@mui/icons-material';

export function NotFoundPage() {
  return (
    <div className="not-found-page">
      <div className="not-found-container">
        <div className="not-found-content">
          <div className="not-found-logo">
            <IconLogo />
          </div>
          
          <div className="not-found-text">
            <h1 className="not-found-title">404</h1>
            <h2 className="not-found-subtitle">Page Not Found</h2>
            <p className="not-found-description">
              Oops! The page you're looking for doesn't exist. It might have been moved, deleted, or you entered the wrong URL.
            </p>
          </div>
          
          <div className="not-found-actions">
            <Link to="/" className="not-found-button primary">
              <HomeIcon />
              <span>Back to Home</span>
            </Link>
            <Link to="/marketplace" className="not-found-button secondary">
              <StoreIcon />
              <span>Browse NFTs</span>
            </Link>
          </div>
          
          <div className="not-found-suggestions">
            <h3>What you can do:</h3>
            <ul>
              <li>Check the URL for typos</li>
              <li>Go back to the homepage</li>
              <li>Browse our NFT marketplace</li>
              <li>Create your own Nogglr NFT</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default dynamic(() => Promise.resolve(NotFoundPage), { ssr: false });
