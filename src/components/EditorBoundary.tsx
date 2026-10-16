import { Component, type ReactNode } from "react";

/**
 * The code editor is a lazy chunk. After a redeploy, a tab opened earlier asks
 * for a chunk that no longer exists; without this boundary React unmounts the
 * whole quiz and leaves a blank page.
 */
export default class EditorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="code-editor loading editor-failed" role="alert">
        <p>The editor could not load. The site was probably updated.</p>
        <button className="show-explanation-button" onClick={() => window.location.reload()}>
          Reload the page
        </button>
      </div>
    );
  }
}
